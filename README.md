# Skill: gerar-avatares-ugc

Skill de Claude Code que gera **15 avatares UGC fotorrealistas** (pessoas reais segurando um produto) em 1080x1920 vertical, estilo selfie amadora de iPhone 7, prontos pra Facebook / Instagram Ads, Stories e prova social em landing page.

Você entrega **uma foto do produto**. A skill anexa essa foto como referência multimodal e gera cada avatar com uma das 15 personas brasileiras já validadas, em ambientes distintos. No fim, ela oferece injetar um carrossel infinito das imagens dentro de um HTML existente.

Gerador: Gemini 3.1 Flash Image (`gemini-3.1-flash-image-preview`).

---

## Instalação

Clone e rode o instalador:

```bash
git clone <URL-DO-REPO> skill-avatares-ugc
cd skill-avatares-ugc
./install.sh
```

Ou copie a pasta na mão:

```bash
cp -r gerar-avatares-ugc ~/.claude/skills/
```

Instalar em `~/.claude/skills/` deixa a skill disponível em **todos** os projetos. Pra restringir a um projeto só, copie pra `<projeto>/.claude/skills/`.

Reinicie o Claude Code depois de copiar. Pra usar, digite `/gerar-avatares-ugc` no chat.

### Registro no CLAUDE.md (opcional)

Pra garantir que a skill dispare pelo comando, adicione em `~/.claude/CLAUDE.md`:

```markdown
# gerar-avatares-ugc
- **gerar-avatares-ugc** (`~/.claude/skills/gerar-avatares-ugc/SKILL.md`) - gera 15 avatares UGC iPhone 7 (1080x1920) com pessoas brasileiras segurando qualquer produto. Trigger: `/gerar-avatares-ugc`
When the user types `/gerar-avatares-ugc`, invoke the Skill tool with `skill: "gerar-avatares-ugc"` before doing anything else.
```

---

## Pré-requisitos

| Item | Pra quê | Como checar |
|---|---|---|
| Node.js | roda o gerador que chama a API do Gemini | `node -v` |
| Python 3 + Pillow | comprime a foto do produto antes do upload | `python3 -c "import PIL"` |
| Chave da API do Gemini | autentica a geração | começa com `AIza` |

Instalar Pillow, se faltar:

```bash
python3 -m pip install Pillow
```

Pegue a chave em [Google AI Studio](https://aistudio.google.com/apikey).

---

## Configuração no projeto

A skill roda dentro de um projeto seu, não dentro da pasta da skill. No projeto onde você vai gerar as imagens:

1. Crie um `.env` na **raiz** do projeto:

```
GEMINI_API_KEY=AIza...
```

2. Copie o gerador pra `_dev/scripts/`:

```bash
mkdir -p _dev/scripts
cp ~/.claude/skills/gerar-avatares-ugc/template-gerar-com-referencia.js _dev/scripts/gerar-com-referencia.js
```

**Atenção ao caminho.** O gerador procura o `.env` dois níveis acima de si mesmo. Ele precisa ficar exatamente em `_dev/scripts/` com o `.env` na raiz do projeto. Em outro caminho, ele aborta dizendo que não encontrou o `.env`.

Nunca commite o `.env`. O `.gitignore` deste repo já cobre isso.

---

## Uso

No Claude Code, dentro do projeto:

```
/gerar-avatares-ugc
```

A skill pede:

- **Caminho da foto do produto** (PNG ou JPG), obrigatório.
- **Pasta de saída**, opcional, default `images/avatares/`.
- **Quantidade**, opcional, default 15.
- **Subset de personas**, opcional, por exemplo "só femininos" ou "só 65+".

Depois ela comprime o produto, monta o batch, roda em background e avisa a cada imagem pronta.

Tempo médio das 15 imagens:

| Etapa | Duração |
|---|---|
| Batch completo | 8 a 12 minutos |
| Timeout por imagem | 180 segundos |
| Retentativas por imagem | 2, com 5 segundos de intervalo |

Imagem que já existe na pasta de saída é pulada, então dá pra retomar um batch interrompido rodando de novo.

---

## O que tem no repo

| Arquivo | Função |
|---|---|
| `gerar-avatares-ugc/SKILL.md` | orquestração, os 6 passos do workflow |
| `gerar-avatares-ugc/personas.md` | bloco BASE do prompt e as 15 personas |
| `gerar-avatares-ugc/template-gerar-com-referencia.js` | chama a API do Gemini com a foto de referência |
| `gerar-avatares-ugc/template-carrossel.html` | carrossel infinito, CSS isolado, injetado no passo 6 |
| `install.sh` | copia a skill pra `~/.claude/skills/` |

---

## Detalhes que fazem a qualidade

Estão dentro do bloco BASE em `personas.md` e existem por tentativa e erro.

- **Tamanho do produto na mão.** O Gemini ignora medidas métricas. O prompt ancora em anatomia: altura do frasco igual à largura da palma aberta, menor que a cabeça, cabendo entre polegar e mindinho.
- **Estética iPhone 7, não iPhone 14 Pro.** Ruído digital nas sombras, textura de pele real com poros e linhas finas, sem airbrush, sem ring light, sem estúdio. Precisa parecer foto de cliente no Status do WhatsApp, não campanha de marca.
- **Fidelidade do rótulo.** O prompt força reproduzir a embalagem 1:1 e proíbe redesenhar o rótulo, caractere por caractere.
- **Compressão obrigatória.** Foto de produto acima de 500KB causa timeout silencioso no upload. A skill comprime pra menos de 150KB antes de enviar.

## Adicionar uma persona nova

A skill tem um fluxo pra isso. Você manda uma foto de referência, ela extrai gênero, idade, etnia, cabelo, óculos, roupa, ambiente, expressão e luz, escreve no formato das existentes e adiciona em `personas.md` com o próximo número, pedindo confirmação antes de salvar.
