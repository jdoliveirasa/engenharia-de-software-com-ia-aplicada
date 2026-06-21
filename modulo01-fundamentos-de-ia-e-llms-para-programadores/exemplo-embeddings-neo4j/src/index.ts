import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { CONFIG } from './config.ts';
import { DocumentProcessor } from './documentProcessor.ts';
import { type PretrainedOptions } from '@huggingface/transformers';
import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector';
import { displayResults } from './util.ts';

let _neo4jVectorStore: any = null;

async function clearAll(vectorStore: Neo4jVectorStore, nodeLabel: string): Promise<void> {
    console.log(`🧹 Limpando todos os nós com o label "${nodeLabel}" no Neo4j...`);
    await vectorStore.query(
        `MATCH (n:${nodeLabel}) DETACH DELETE n`
    )
    console.log(`✅ Todos os nós com o label "${nodeLabel}" foram removidos do Neo4j.`);
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
    
    /*const response = await embeddings.embedQuery(
        "JavaScript"
    );    
    const response = await embeddings.embedDocuments([
        "JavaScript"
    ]);
    console.log('🔍 Embeddings gerados para a consulta "JavaScript":');
    console.log(response);
    */

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
        "o que significa treinar uma rede neural?"
        //"o que é enconding e quando usar?"
    ]

    for (const question of questions) {

        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 Buscando por similaridade para a consulta: "${question}"...`) ;
        console.log('='.repeat(80));
        const results = await _neo4jVectorStore.similaritySearch(
            question, 
            CONFIG.similarity.topK
        );
        displayResults(results);
    }

    //clean up
    console.log(`\n${'='.repeat(80)}`);
    console.log('🧹 Limpando dados do Neo4j...\n');

} catch (error) {
    console.error('Error processing document:', error);
} finally {
    await _neo4jVectorStore?.close(); // Fecha a conexão com o Neo4j antes de liberar a referência 
}