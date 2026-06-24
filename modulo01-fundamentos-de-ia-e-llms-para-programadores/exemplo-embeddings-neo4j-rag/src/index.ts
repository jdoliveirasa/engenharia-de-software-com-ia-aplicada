// Force IPv4-only DNS resolution — IPv6 is unreachable in this environment and
// causes Node.js undici (fetch) to ETIMEDOUT when connecting to HuggingFace CDN.
import dns from 'dns';
const originalLookup = dns.lookup.bind(dns);
(dns as any).lookup = (hostname: string, options: any, callback: any) => {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    originalLookup(hostname, { ...options, family: 4 }, callback);
};

import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { CONFIG } from './config.ts';
import { DocumentProcessor } from './documentProcessor.ts';
import { type PretrainedOptions } from '@huggingface/transformers';
import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector';
import { displayResults } from './util.ts';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { AI } from './ai.ts';
import { writeFile, mkdir } from 'node:fs/promises';

let _neo4jVectorStore: any = null;

async function clearAll(vectorStore: Neo4jVectorStore, nodeLabel: string): Promise<void> {
    console.log(`🧹 Limpando todos os nós com o label "${nodeLabel}" no Neo4j...`);
    await vectorStore.query(
        `MATCH (n:${nodeLabel}) DETACH DELETE n`
    )
    console.log(`✅ Todos os nós com o label "${nodeLabel}" foram removidos do Neo4j.`);
}

async function dropIndexIfExists(indexName: string): Promise<void> {
    const driver = neo4j.driver(
        CONFIG.neo4j.url,
        neo4j.auth.basic(CONFIG.neo4j.username, CONFIG.neo4j.password)
    );
    const session = driver.session();
    try {
        await session.run(`DROP INDEX ${indexName} IF EXISTS`);
        console.log(`🗑️  Índice "${indexName}" removido (se existia).`);
    } finally {
        await session.close();
        await driver.close();
    }
}

try {
    console.log('🚀 Inicializando sistema de Embeddings com Neo4j...\n');
    const documentProcessor = new DocumentProcessor(
        CONFIG.pdf.path,
        CONFIG.textSplitter
    );
    const documents = await documentProcessor.loadAndSplit();
    const embeddings = new HuggingFaceTransformersEmbeddings({
        model: CONFIG.embedding.modelName,
        pretrainedOptions: CONFIG.embedding.pretrainedOptions as PretrainedOptions
    })

    const nlpModel = new ChatOpenAI({
        temperature: CONFIG.openRouter.temperature,
        maxRetries: CONFIG.openRouter.maxRetries,
        modelName: CONFIG.openRouter.nlpModel,
        openAIApiKey: CONFIG.openRouter.apiKey,
        configuration: {
            baseURL: CONFIG.openRouter.url,
            defaultHeaders: CONFIG.openRouter.defaultHeaders,
        }
    })
    
    /*const response = await embeddings.embedQuery(
        "JavaScript"
    );    
    const response = await embeddings.embedDocuments([
        "JavaScript"
    ]);
    console.log('🔍 Embeddings gerados para a consulta "JavaScript":');
    console.log(response);
    */

    await dropIndexIfExists(CONFIG.neo4j.indexName);

    _neo4jVectorStore = await Neo4jVectorStore.fromExistingGraph(
        embeddings,
        CONFIG.neo4j
    );

    await clearAll(_neo4jVectorStore, CONFIG.neo4j.nodeLabel);

    for (const [index, doc] of documents.entries()) {
        console.log(`📄 Processando documento ${index + 1}/${documents.length}...`) ;
        await _neo4jVectorStore.addDocuments([doc]);
    }

    console.log(`✅ Todos os documentos foram processados e armazenados no Neo4j com sucesso!`);

    // ==== STEP 2: RUN SIMILARITY SEARCH ====
    console.log('\n🔍 Realizando busca de similaridade para a consulta "Query"...');
    const questions = [
        "o que são tensores e como são representados em JavaScript?",        
        "o que significa treinar uma rede neural?",
        "o que é hot enconding e quando usar?", 
        "como converter objetos JavaScript em tensores?",
        "o que é normalização de dados e por que é importante para redes neurais?",
        "como funciona o tensorflow.js e quais são suas principais funcionalidades?",
    ]

    const ai = new AI({
        nlpModel,
        debugLog: console.log,
        vectorStore: _neo4jVectorStore,
        promptConfig: CONFIG.promptConfig,
        templateText: CONFIG.templateText,
        topK: CONFIG.similarity.topK,
    });

    for (const index in questions) {
        const question = questions[index];
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 Buscando por similaridade para a consulta: "${question}"...`) ;
        console.log('='.repeat(80));
        
        const result = await ai.answerQuestion(question!);

        if (result.error) {
            console.log(`❌ Erro ao responder a pergunta: ${result.error}`);
            continue;
        } 
        
        console.log(`✅ Resposta gerada:\n${result.answer}`);
        await mkdir(CONFIG.output.answerFolder, { recursive: true });
        
        const fileName = `${CONFIG.output.answerFolder}/${CONFIG.output.fileName}
        -${index}-${Date.now()}.md`;
        
        await writeFile(fileName, result.answer!)
        
        
        //const result = await ai.answerQuestion(question);

        /*
        const results = await _neo4jVectorStore.similaritySearch(
            question, 
            CONFIG.similarity.topK
        );
        displayResults(results);
        */
    }

    //clean up
    console.log(`\n${'='.repeat(80)}`);
    console.log('🧹 Limpando dados do Neo4j...\n');

} catch (error) {
    console.error('Error processing document:', error);
} finally {
    await _neo4jVectorStore?.close(); // Fecha a conexão com o Neo4j antes de liberar a referência 
}