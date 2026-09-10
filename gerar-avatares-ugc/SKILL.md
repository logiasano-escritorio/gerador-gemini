---
name: gerar-avatares-ugc
description: Gera 15 avatares UGC iPhone 7 (pessoas reais segurando um produto) em 1080x1920 vertical, usando Gemini 3.1 Flash Image. Recebe a foto do produto como referência única e usa 15 personas brasileiras pré-definidas com ambientes brasileiros distintos. Após gerar, oferece injetar carrossel infinito num HTML existente. Reutilizável para qualquer produto. Trigger: /gerar-avatares-ugc
---

# /gerar-avatares-ugc

Você é o orquestrador do workflow de geração de avatares UGC fotorrealistas para anúncios e provas sociais. O usuário já validou o método; sua função é executar com precisão.

---

## PASSO 1 — RECEBER OS INPUTS

O usuário deve fornecer:

1. **Caminho da imagem do produto** (PNG/JPG). Ex: `strongbones/images/produto.png`
2. **Pasta de saída** (opcional, default: `images/avatares/`)
3. **Quantidade** (opcional, default: `15` — todos os personas)
4. **Subset de personas** (opcional, ex: "só femininos", "só seniors 65+")

Se faltar o produto, pergunte:
> "Me manda o caminho da foto do produto (PNG/JPG). Vou comprimir, gerar os avatares e salvar na pasta."

---

## PASSO 2 — VERIFICAR A INFRAESTRUTURA

Confirme que existe:

- **Script gerador:** `_dev/scripts/gerar-com-referencia.js` (no projeto atual). Se não existir, copie o template em `template-gerar-com-referencia.js` desta skill para o projeto.
- **Chave Gemini:** procure `.env` no projeto com `GEMINI_API_KEY`. Se não existir, peça ao usuário.
- **Python + PIL:** necessário para comprimir o produto.

---

## PASSO 3 — COMPRIMIR O PRODUTO

Imagens de produto >500KB demoram demais no upload e podem causar timeout silencioso do Gemini. Comprimir é obrigatório:

```python
from PIL import Image
import os

img = Image.open('CAMINHO_PRODUTO_ORIGINAL')
img.thumbnail((1024, 1024))
if img.mode == 'RGBA':
    bg = Image.new('RGB', img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[3])
    img = bg
img.save('CAMINHO_PRODUTO_SMALL.jpg', 'JPEG', quality=88, optimize=True)
```

Salve como `produto-small.jpg` na mesma pasta do original.

**Validação:** o arquivo final deve ter <150KB.

---

## PASSO 4 — GERAR O BATCH SCRIPT

Crie um arquivo bash temporário que itera os 15 prompts (ou subset). Use os personas de `personas.md` (mesma pasta desta skill). Estrutura:

```bash
#!/usr/bin/env bash
set -e
cd "<PROJETO_ROOT>"

REF="<caminho-produto-small.jpg>"
OUT="<pasta-saida>"
mkdir -p "$OUT"

BASE="<conteúdo do bloco BASE de personas.md>"

run() {
  local n="$1" file="$2" persona="$3"
  echo ""
  echo "=== [$n] $file ==="
  if [ -f "$OUT/$file" ]; then echo "SKIP (ja existe)"; return; fi
  for attempt in 1 2; do
    if timeout 180 node _dev/scripts/gerar-com-referencia.js "$REF" "$BASE $persona" "$OUT/$file" "9:16"; then
      return 0
    fi
    echo "FALHA tentativa $attempt"
    sleep 5
  done
  echo "ABORTADA $file (2 falhas)"
}

# (linhas run "01" ... run "15" geradas a partir de personas.md)
```

**Parâmetros não-negociáveis:**
- `timeout 180` por imagem (Gemini fica lento em horários de pico)
- `retry 2x` com sleep 5s
- `skip se existe` (permite retomar batch interrompido)
- aspect ratio: **`9:16`** (1080x1920 vertical para Stories/Reels/feed mobile)

---

## PASSO 5 — EXECUTAR E NOTIFICAR

Rode o batch em background (`run_in_background: true`) e use Monitor com filtro:

```
grep -E "===|^OK|^SKIP|FALHA|ABORTADA|TODOS"
```

Avise o usuário a cada avatar pronto. Tempo médio total: 8-12 minutos para 15 imagens.

Ao final:
1. Liste quantos saíram com sucesso (`ls $OUT | wc -l`)
2. Mostre paths completos
3. Se algum falhou, ofereça retry isolado
4. **Pergunte ao usuário se quer injetar o carrossel num HTML** (PASSO 6).

---

## PASSO 6 — INJETAR CARROSSEL NUM HTML (opcional)

Após gerar os avatares, ofereça ao usuário:

> "Quer que eu injete um carrossel infinito dessas imagens num HTML existente? Me passa: 1) caminho do HTML, 2) onde inserir (ex: 'antes do CTA final', 'depois do hero', ou um seletor/marker)."

Se o usuário aceitar, execute:

### 6.1 — Coletar inputs

- **Caminho HTML alvo** (ex: `strongbones-artrose.html`)
- **Ponto de inserção** — uma das opções:
  - Texto âncora: insere ANTES de uma string única (ex: "antes da seção CTA")
  - Marker HTML: insere onde tem comentário `<!-- UGC_CARROSSEL -->`
  - Final do `<body>`: default se não especificar
- **Header customizado** (opcional). Default PT-BR:
  - Title: `Histórias Reais, <strong>Resultados Reais</strong>`
  - Subtitle: `Experiências verdadeiras com <Produto>` (substitua `<Produto>` pelo nome detectado do HTML/path)

### 6.2 — Calcular caminhos de imagem relativos

O carrossel usa `<img src="...">` — o path DEVE ser relativo ao HTML alvo, não absoluto.

Exemplo: se HTML está em `Sanologia/strongbones-artrose.html` e imagens em `Sanologia/strongbones/images/swap-elare/`, o `src` deve ser `strongbones/images/swap-elare/avatar-NN.png`.

Use Python ou Node pra calcular `os.path.relpath()` entre HTML e pasta de imagens.

### 6.3 — Gerar o snippet HTML

Leia `template-carrossel.html` desta skill e substitua:

- `{{HEADER}}` → header customizado ou default
- `{{SUBHEADER}}` → subtitle
- `{{IMGS}}` → **2 cópias** consecutivas da lista de `<div class="ugc-carousel__item"><img src="..."></div>` (a duplicação é o que faz o loop ser seamless)

Exemplo de bloco gerado para `{{IMGS}}` com 3 imagens (extrapolar pra 15):

```html
<div class="ugc-carousel__item"><img src="strongbones/images/swap-elare/avatar-01-loira-sofa-bege.png" alt="" loading="lazy"></div>
<div class="ugc-carousel__item"><img src="strongbones/images/swap-elare/avatar-02-senhor-barba-sofa-creme.png" alt="" loading="lazy"></div>
<div class="ugc-carousel__item"><img src="strongbones/images/swap-elare/avatar-03-senhor-poltrona-marrom.png" alt="" loading="lazy"></div>
<!-- DUPLICATA pra loop seamless -->
<div class="ugc-carousel__item"><img src="strongbones/images/swap-elare/avatar-01-loira-sofa-bege.png" alt="" loading="lazy"></div>
<div class="ugc-carousel__item"><img src="strongbones/images/swap-elare/avatar-02-senhor-barba-sofa-creme.png" alt="" loading="lazy"></div>
<div class="ugc-carousel__item"><img src="strongbones/images/swap-elare/avatar-03-senhor-poltrona-marrom.png" alt="" loading="lazy"></div>
```

### 6.4 — Injetar no HTML

Use a tool **Edit** com:
- `old_string`: texto âncora (ex: a linha imediatamente antes do CTA, garantindo unicidade)
- `new_string`: o snippet completo + o texto âncora preservado

**Validações antes de injetar:**
1. Confirmar que o HTML existe (Read first)
2. Confirmar que o ponto de inserção é único no arquivo
3. Mostrar preview de 5 linhas ao redor do ponto de inserção
4. Pedir confirmação antes do Edit

### 6.5 — Testar

Após injetar:
1. Confirmar que o Edit foi aceito
2. Sugerir abrir o HTML no browser pra verificar
3. Avisar sobre comportamento esperado: scroll lento contínuo, pausa no hover, responsivo mobile

### Regras críticas do snippet
- CSS é **scoped** com prefixo `.ugc-carousel` — não polui CSS existente
- Animation `60s linear infinite` (pode ajustar se usuário pedir)
- Inclui `prefers-reduced-motion` (acessibilidade)
- Inclui `mask-image` para fade nas pontas
- Hover pausa o scroll (UX padrão de tickers)

---

## REGRAS CRÍTICAS DA QUALIDADE VISUAL

Estas regras estão dentro do `BASE` em `personas.md` mas merecem destaque:

### Tamanho do produto na mão (problema histórico)
O Gemini não entende medidas métricas (cm, ml). Ancore em referências anatômicas:
- ✅ "bottle height equal to the width of the person's open palm"
- ✅ "smaller than the person's face/head"
- ✅ "fits naturally between thumb and pinky"
- ❌ "12cm tall" / "200ml bottle" — Gemini ignora

### Estética iPhone 7 UGC (não inventar)
- iPhone 7/8 era (não 14 Pro) — câmera mais "humana"
- Subtle digital noise nas sombras
- Mild lens flare se houver janela
- Realistic skin texture: poros, peach fuzz, fine lines
- NO airbrushing, NO plastic AI skin
- NO ring light, NO professional studio
- Looks like Instagram Stories / WhatsApp, NOT brand campaign

### Fidelidade do rótulo
- "Reproduce the bottle 1:1 from reference, do not redesign"
- Listar elementos do rótulo explicitamente quando relevante
- Forçar `do not redesign label, copy each character exactly`

---

## ARQUIVOS DESTA SKILL

- `SKILL.md` — este arquivo (orquestração)
- `personas.md` — os 15 prompts de persona + bloco BASE
- `template-gerar-com-referencia.js` — script gerador (copiar pro projeto se não existir)
- `template-carrossel.html` — template do carrossel infinito (PASSO 6)

---

## QUANDO ADICIONAR PERSONA NOVA

Se o usuário pedir para adicionar uma persona (ex: "tenho uma foto de mulher jovem academia, adiciona"):

1. Extraia da foto: gênero, idade, etnia, cabelo, óculos, roupa, ambiente, expressão, luz
2. Escreva no formato dos personas existentes (1-2 frases)
3. Adicione em `personas.md` com próximo número disponível
4. Confirme com o usuário antes de salvar
