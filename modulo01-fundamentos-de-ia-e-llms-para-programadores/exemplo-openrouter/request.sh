source .env

API_URL="https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME="My Example"

NLP_MODEL="google/gemma-4-31b-it:free"

curl --silent -X POST "$API_URL" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $OPENROUTER_API_KEY" \
-H "HTTP-Referer: $OPENROUTER_SITE_URL" \
-H "X-Title: $OPENROUTER_SITE_NAME" \
-d '
    {
        "model": '"'$NLP_MODEL'"',
        "messages": [
            {
                "role":"user",
                "content":"Me conte uma curiosidade sobre LLMs"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1000
}' | jq

<<comment
{
  "id": "gen-1779005343-5QrbCCaX1MEFVCwTYEnS",
  "object": "chat.completion",
  "created": 1779005343,
  "model": "google/gemma-4-31b-it-20260402:free",
  "provider": "Google AI Studio",
  "system_fingerprint": null,
  "service_tier": "standard",
  "choices": [
    {
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop",
      "native_finish_reason": "STOP",
      "message": {
        "role": "assistant",
        "content": "Uma curiosidade fascinante sobre os LLMs (Large Language Models) é que eles **não \"sabem\" fatos**, mas sim **estatísticas de probabilidade**.\n\nAqui está a explicação detalhada do porquê isso é surpreendente:\n\n### O \"Papagaio Estocástico\"\nMuitas pessoas pensam que o ChatGPT ou o Gemini funcionam como um Google sofisticado, que busca a resposta correta em um banco de dados. Na verdade, eles funcionam mais como um **autocompletar extremamente potente**.\n\nQuando você faz uma pergunta, o modelo não está \"consultando\" a verdade; ele está calculando: *\"Dada a sequência de palavras que o usuário escreveu, qual é a próxima palavra (ou token) mais provável de vir a seguir, com base em tudo o que eu li na internet?\"*\n\n### Por que isso gera as \"Alucinações\"?\nIsso explica por que os LLMs às vezes inventam fatos com total confiança (as chamadas **alucinações**). \n\nSe você perguntar sobre um livro que não existe, mas usar termos que soam como literatura acadêmica, o modelo pode gerar um resumo convincente. Ele não está mentindo (porque não tem consciência de verdade ou mentira), ele está apenas seguindo a probabilidade estatística de como um \"resumo de livro\" geralmente é escrito. Para o modelo, a frase *\"O livro X foi escrito por Y em 1920\"* é estatisticamente plausível, mesmo que seja factualmente falsa.\n\n### A \"Emergência\" de Habilidades\nO que é realmente misterioso para os cientistas é que, ao aumentar a escala desses modelos (mais dados e mais processamento), começaram a surgir **capacidades emergentes**. \n\nOs modelos foram treinados apenas para prever a próxima palavra, mas, no processo, eles \"aprenderam\" indiretamente a:\n*   Programar em Python.\n*   Resolver problemas de lógica.\n*   Traduzir idiomas.\n*   Explicar piadas.\n\nNinguém programou explicitamente \"regras de lógica\" ou \"gramática de Python\" neles; o modelo deduziu essas estruturas apenas tentando prever a próxima palavra em bilhões de exemplos.",
        "refusal": null,
        "reasoning": null
      }
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 481,
    "total_tokens": 490,
    "cost": 0,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0,
      "upstream_inference_prompt_cost": 0,
      "upstream_inference_completions_cost": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "image_tokens": 0,
      "audio_tokens": 0
    }
  }
}
comment