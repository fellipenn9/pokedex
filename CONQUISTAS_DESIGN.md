# Sistema de Conquistas PokéDex — "Liga dos Treinadores"

> Documento de design (gerado em 2026-06-05 via brainstorm multi-agente + síntese).
> Status: **proposta aprovada para anotar**. Implementação ainda não iniciada.

## 1. Visão geral

O sistema transforma o ato frio de "marcar Pokémon" em uma **jornada de treinador com insígnias colecionáveis**, no espírito do anime: cada conquista é uma medalha física que entra na sua "Vitrine de Insígnias". A engenharia de engajamento se apoia em quatro alavancas:

- **Granularidade de recompensa**: marcos pequenos e frequentes no início (1, 10, 25 Pokémon) liberam dopamina cedo; metas grandes (1025, tipos completos) sustentam o longo prazo. Ninguém fica "sem nada para perseguir".
- **Múltiplos eixos de progresso**: total, %, geração, região, tipo, coleção Full Art e categorias temáticas (lendários, iniciais, Eevee...). Quem cansa de um eixo migra para outro — sempre há "a próxima insígnia mais perto".
- **Visibilidade do quase-lá**: a aba Conquistas mostra a barra de cada medalha ("142/154 Água"), criando o gatilho clássico do colecionador: *"faltam só 12, vou fechar"*.
- **Identidade**: títulos exibíveis ("Mestre de Kanto", "Mestre Pokémon") dão status, mesmo sem economia no app.

Os dados confirmados no app (`index.html`, doc Firestore `users/{uid}` com campos irmãos `collection` e `pokedexTracker`) cobrem **a grande maioria das conquistas sem alterar o backend**. Apenas algumas categorias temáticas exigem listas estáticas, e duas exigem novos campos (sorteios, datas) — sinalizadas claramente na seção 4.

---

## 2. Sistema de insígnias / tiers

**Quatro níveis** (decisão Fellipe 2026-06-06: removido o Platina; do Ouro vai direto ao Diamante):

| Tier | Cor / acabamento | Significado | Faixa típica de dificuldade |
|------|------------------|-------------|------------------------------|
| 🥉 **Bronze** | Metal fosco | Primeiros passos | trivial (1-50 itens, ou grupo de 3) |
| 🥈 **Prata** | Metal polido | Progresso sólido | médio (50-250, metades) |
| 🥇 **Ouro** | Dourado brilhante | Domínio de um eixo | alto (gerações/regiões/tipos completos) |
| 💎 **Diamante** | **Roxo ametista imponente** (estático, com aura — NÃO holográfico/alternando cor) | Lendário | máximo (100% global, conjuntos supremos) |

> O que era 💠 Platina nos grupos abaixo deve ser reatribuído a 🥇 Ouro ou 💎 Diamante (revisar na implementação).

**Como o usuário vê o progresso (aba Conquistas):**
- Grid de cards de insígnia. Desbloqueadas: coloridas com o tier. Bloqueadas: silhueta cinza + **barra de progresso** ("768 / 1025").
- Topo da aba: contador global **"X / N insígnias"** e um anel por tier ("Diamante 2/9").
- Filtro por grupo (Jornada, Gerações, Regiões, Tipos, Coleção, Temáticas, Secretas).
- Secretas aparecem como **"???"** (carta virada) até desbloquear — reaproveitando o visual de "reveal" do sorteador.

---

## 3. Grupos de conquistas curados

> Notação de critério (helpers já existentes ou triviais sobre os dados confirmados):
> `reg(n)` = `pokedexTracker[n] === true` (no app é `isRegistered(n)`).
> `totalReg` = nº de `pokedexTracker[n] === true`.
> `regByType(t)`, `regByGen(g)`, `regByRegion(r)` = contagem de registrados filtrando `POKEDEX_DATA`.
> `pkmComCarta(n)` = `n` existe em `collection` com ≥1 carta.

### Grupo A — Jornada do Treinador (marcos de captura)

| Nome | Descrição | Critério | Tier | Ícone |
|------|-----------|----------|------|-------|
| Saí de Pallet | Registre seu primeiro Pokémon. | `totalReg >= 1` | 🥉 | Treinador na porta ao amanhecer + Pokébola brilhando |
| Equipe de Bolso | 10 registros — dá pra montar um time. | `totalReg >= 10` | 🥉 | 10 pokébolas em arco |
| Caçador Iniciante | 25 registros. | `totalReg >= 25` | 🥉 | Hexágono com "25" |
| Pesquisador de Campo | 50 registros. | `totalReg >= 50` | 🥈 | Lupa sobre página de Pokédex |
| Centurião Pokémon | 100 registros. | `totalReg >= 100` | 🥈 | Dourado "100" com raios |
| Um Quarto do Caminho | 250 registros (~24%). | `totalReg >= 250` | 🥈 | Anel 1/4 + mosaico de tipos |
| Linha do Equador | 513 registros (50,05%). | `totalReg >= 513` | 🥇 | Globo dividido, metade em platina |
| Reta Final à Vista | 769 registros (75%). | `totalReg >= 769` | 🥇 | Anel 3/4 + bandeira quadriculada |
| Contagem Regressiva | 1000 registros — faltam só 25! | `totalReg >= 1000` | 💠 | Painel "25 restantes" + fogos |
| Mestre Pokémon | Registre TODOS os 1025. | `totalReg >= 1025` | 💎 | Coroa de diamante com Master Ball |

### Grupo B — Insígnias de Geração

| Nome | Descrição | Critério | Tier | Ícone |
|------|-----------|----------|------|-------|
| Mestre de Kanto — A Origem | 151 da Gen 1. | `regByGen(1) >= 151` | 🥇 | Pokébola clássica "151" |
| Despertar de Johto | 100 da Gen 2. | `regByGen(2) >= 100` | 🥇 | Sino prateado "100" |
| Soberano de Hoenn | 135 da Gen 3. | `regByGen(3) >= 135` | 🥇 | Gota com onda "135" |
| Guardião de Sinnoh | 107 da Gen 4. | `regByGen(4) >= 107` | 🥇 | Cristal de neve "107" |
| Herói de Unova | 156 da Gen 5 (a maior). | `regByGen(5) >= 156` | 💠 | Hexágono urbano "156" |
| Cavaleiro de Kalos | 72 da Gen 6 (a menor). | `regByGen(6) >= 72` | 🥇 | Flor-de-lis "72" |
| Kahuna de Alola | 88 da Gen 7. | `regByGen(7) >= 88` | 🥇 | Z-Crystal tropical "88" |
| Campeão de Galar | 96 da Gen 8. | `regByGen(8) >= 96` | 🥇 | Escudo medieval "96" |
| Tesouro de Paldea | 120 da Gen 9. | `regByGen(9) >= 120` | 🥇 | Medalha acadêmica "120" |
| Primeiro Ginásio | Complete qualquer 1 geração pela 1ª vez. | `∃ g: regByGen(g) === total_g` | 🥈 | Insígnia brilhando num cinto vazio |
| Equilibrista das Eras | ≥50% em TODAS as 9 gerações. | `∀ g: regByGen(g) >= ceil(total_g/2)` | 🥇 | Balança com 9 gemas equilibradas |
| Lenda Viva — Todas as Eras | 100% das 9 gerações (= 1025). | `regByGen(g)===total_g ∀ g` | 💎 | Coroa de 9 gemas formando Master Ball |

> *Marcos de 50% (bronze) opcionais para fase 2:* Kanto ≥76, Unova ≥78, Kalos ≥36.

### Grupo C — Insígnias de Região (Atlas do Treinador)

Separa Galar (89) de Hisui (7), que dividem a Gen 8.

| Nome | Descrição | Critério | Tier | Ícone |
|------|-----------|----------|------|-------|
| Andarilho de Kanto | 151 de Kanto. | `regByRegion('Kanto') >= 151` | 🥇 | Mapa-medalha, pino em Pallet |
| Peregrino de Johto | 100 de Johto. | `>= 100` | 🥇 | Mapa com Bell Tower |
| Navegador de Hoenn | 135 de Hoenn. | `>= 135` | 🥇 | Ilha com ondas |
| Alpinista de Sinnoh | 107 de Sinnoh. | `>= 107` | 🥇 | Pico nevado do Coronet |
| Metropolitano de Unova | 156 de Unova. | `>= 156` | 💠 | Skyline de arranha-céus |
| Esteta de Kalos | 72 de Kalos. | `>= 72` | 🥇 | Torre estilo Eiffel |
| Ilhéu de Alola | 88 de Alola. | `>= 88` | 🥇 | 4 ilhas tropicais e sol |
| Lorde de Galar | 89 de Galar. | `>= 89` | 🥇 | Estádio + coroa real |
| Arqueólogo de Hisui | 7 ancestrais de Hisui. | `regByRegion('Hisui') >= 7` | 🥈 | Pergaminho com 7 selos |
| Acadêmico de Paldea | 120 de Paldea. | `>= 120` | 🥇 | Medalha de academia |
| Trio Clássico | 100% de Kanto + Johto + Hoenn (386). | os 3 completos | 💠 | 3 medalhas antigas em corrente de ouro |
| Nova Geração | 100% de Galar + Hisui + Paldea (216). | os 3 completos | 💠 | 3 medalhas futuristas |
| Cartógrafo Supremo | 100% das 10 regiões (= 1025). | `∀ r: regByRegion(r) === total_r` | 💎 | Atlas giratório com 10 pinos formando Pokébola |

### Grupo D — Insígnias de Ginásio (Tipo)

Critério genérico: **todos os Pokémon cujo `types` inclui T estão registrados** → `regByType(T) === total_T`. Tipo duplo conta para os dois ginásios. Tier proporcional ao tamanho do tipo.

| Nome | Tipo (total) | Tier | Ícone |
|------|-------------|------|-------|
| Insígnia Cascata | Água (154) | 💠 | Gota azul facetada |
| Insígnia Equilíbrio | Normal (131) | 💠 | Estrela bege simétrica |
| Insígnia Bosque | Grama (127) | 🥇 | Folha verde, brasão |
| Insígnia Brisa | Voador (109) | 🥇 | Par de asas celestes |
| Insígnia Mente | Psíquico (102) | 🥇 | Olho em espiral hipnótica |
| Insígnia Casulo | Inseto (92) | 🥇 | Olho composto em hexágono |
| Insígnia Toxina | Veneno (83) | 🥈 | Gota roxa com bolhas |
| Insígnia Brasa | Fogo (81) | 🥈 | Chama com núcleo dourado |
| Insígnia Terremoto | Terra (75) | 🥈 | Fenda de solo |
| Insígnia Penhasco | Pedra (74) | 🥈 | Rocha bruta facetada |
| Insígnia Punho | Lutador (73) | 🥈 | Punho em octógono |
| Insígnia Ascensão | Dragão (70) | 💠 | Cabeça de dragão índigo |
| Insígnia Trovão | Elétrico (69) | 🥈 | Raio com aro de cobre |
| Insígnia Eclipse | Sombrio (69) | 🥈 | Lua crescente negra |
| Insígnia Assombração | Fantasma (65) | 🥈 | Chama-alma roxa |
| Insígnia Engrenagem | Ferro/Aço (65) | 🥈 | Engrenagem cromada |
| Insígnia Encanto | Fada (64) | 🥈 | Coração rosa com brilho |
| Insígnia Geleira | Gelo (48) — o menor grupo | 🥉 | Cristal hexagonal com floco |

**Conquistas-agregadoras de tipo (Conselho Elemental):**

| Nome | Descrição | Critério | Tier | Ícone |
|------|-----------|----------|------|-------|
| Espectro Completo | ≥1 registrado de cada um dos 18 tipos. | `regByType(t) >= 1 ∀ 18` | 🥉 | Roseta arco-íris com 18 mini-símbolos |
| Trio Inicial | 100% de Fogo (81) + Água (154) + Grama (127). | os 3 completos | 💎 | 3 chamas entrelaçadas |
| Elite — 10 Ginásios | Complete 10 dos 18 tipos. | `count(tipos 100%) >= 10` | 🥇 | Estojo com 10 slots preenchidos |
| Grande Mestre dos Ginásios | Complete TODOS os 18 tipos (= 1025). | `regByType(t)===total_t ∀ t` | 💎 | Coroa com os 18 símbolos |

> *Duais opcionais (fase 2, sem lista extra):* **Senhor dos Céus** (Dragão + Voador, 💎), **Jardim Tóxico** (Grama + Veneno, 🥇), **Pureza** (todos de tipo único, `types.length===1`, 💎).

### Grupo E — Categorias Temáticas (exigem listas estáticas — ver seção 4)

| Nome | Descrição | Critério | Tier | Ícone |
|------|-----------|----------|------|-------|
| **Lendários** | | | | |
| Sopro das Aves Ancestrais | Articuno, Zapdos, Moltres. | `reg(144)&&reg(145)&&reg(146)` | 🥉 | Penas de gelo/raio/fogo |
| Senhor do Clima | Kyogre, Groudon, Rayquaza. | `reg(382)&&reg(383)&&reg(384)` | 🥇 | Mar/terra/céu com esmeralda |
| Os Arquitetos do Universo | Dialga, Palkia, Giratina. | `reg(483)&&reg(484)&&reg(487)` | 💠 | Ampulheta cósmica fragmentada |
| Conselho dos Lendários | 100% da lista `LENDARIOS`. | todos registrados | 💎 | Coroa de Arceus |
| **Míticos** | | | | |
| O Ancestral de Todos | Mew (#151). | `reg(151)` | 🥈 | Esfera rosa com cauda |
| Colecionador de Eventos | ≥ metade dos Míticos. | `count(reg ∈ MITICOS) >= ceil(len/2)` | 💠 | Caixa de presente com luzes |
| Caçador de Míticos Lendário | 100% da lista `MITICOS`. | todos registrados | 💎 | Medalha holográfica |
| **Iniciais** | | | | |
| Primeira Escolha | Iniciais de Kanto (1, 4, 7). | `reg(1)&&reg(4)&&reg(7)` | 🥉 | 3 pokébolas: folha/chama/gota |
| O Professor Aprova | Os 27 iniciais base. | 100% `INICIAIS_BASE` | 🥇 | Mesa de lab com 9 trios |
| Parceiros Evoluídos | As 27 evoluções finais. | 100% `INICIAIS_FINAIS` | 💠 | 3 silhuetas coroadas |
| **Eevee** | | | | |
| Potencial Evolutivo | Eevee (#133). | `reg(133)` | 🥉 | Eevee na Pokébola com 8 setas |
| Mestre das Oito Faces | Eevee + as 8 Eeveelutions. | 100% `EEVEE_LINHA` (9) | 💎 | Roda arco-íris de Eevee |
| **Pseudo-lendários** | | | | |
| Clube dos 600 | ≥5 dos 10 pseudo finais. | `count(reg ∈ PSEUDO_FINAIS) >= 5` | 🥇 | 5 escamas em leque |
| Sangue de Pseudo-Lendário | Os 10 pseudo finais. | 100% `PSEUDO_FINAIS` | 💎 | Garra dracônica com 10 escamas |
| **Bebês / Fósseis** | | | | |
| Diretor do Berçário | Todos os ~18 bebês. | 100% `BEBES` | 💠 | Berço com 18 medalhões |
| Paleontólogo Lendário | Todos os ~25 fósseis. | 100% `FOSSEIS` | 💎 | Picareta + pincel revelando fósseis |

### Grupo F — Coleção Full Art (aba Coleção)

Usa os números reais do `fullart_cards.json` (~690 Pokémon com Full Art, ~3000 cartas).

| Nome | Descrição | Critério | Tier | Ícone |
|------|-----------|----------|------|-------|
| Primeira Joia | Registre sua 1ª Full Art. | `pkmComCarta count >= 1` | 🥉 | Carta holográfica única |
| Folheador de Sleeves | Full Arts de 50 Pokémon distintos. | `>= 50` | 🥈 | Página 9-slots parcial |
| Dono de Loja de Cartas | 150 distintos. | `>= 150` | 🥇 | Vitrine com fichários |
| Curador de Galeria | 345 distintos (metade). | `>= 345` | 💠 | Carta sob holofote |
| Arquivo Completo | ≥1 Full Art dos 690. | `>= 690` | 💎 | Cofre revelando fichário cravejado |
| Ilustração Especial | 20 Special Illustration Rare. | `count(rarity) >= 20` | 🥇 | Estrela dourada em moldura |
| Caçador de Hyper Rare | 10 Hyper Rare. | `count(rarity) >= 10` | 🥇 | Moldura rainbow |
| As Coroas Mega | Mega Hyper Rare (teto do catálogo). | `count >= total_catalogo` | 💎 | Coroas sobre carta cromada |
| Obsessão por Charizard | 25 Full Arts do mesmo Pokémon. | `∃ pkm: nCartas >= 25` | 💎 | Trono de cartas flamejante |
| Visto e Possuído | 25 Pokémon capturados E com Full Art. | `count(reg(n) && pkmComCarta(n)) >= 25` | 🥈 | Pokébola revelando carta foil |
| Espelho Perfeito | Todos os 690 capturados E colecionados. | `interseção === 690` | 💎 | 2 fichários espelhados |

> Calcular os tetos de raridade em runtime a partir do `fullart_cards.json` (não hard-codar), para a conquista nunca ficar impossível se o catálogo mudar.

### Grupo G — Fichário (Páginas)

| Nome | Descrição | Critério | Tier | Ícone |
|------|-----------|----------|------|-------|
| Primeira Folha Cheia | Complete #001–#020. | números 1..20 registrados | 🥉 | Página 20-slots cheia |
| Fichário Lendário | Complete as 52 páginas (= 1025). | todos 1025 registrados | 💎 | Capa diamante "1025/1025" |

> ⚠️ **Ressalva:** `getSlotsPerPage()` é responsivo (6/9/16/20 por tela). Para conquistas, **fixar 20 slots/página** (independente do layout) ou manter só estas duas, evitando ambiguidade entre dispositivos.

### Grupo H — Secretas / Easter Eggs (reveal "???")

| Nome | Descrição | Critério | Tier |
|------|-----------|----------|------|
| Escolhi Você! | Registre o Pikachu (#025). | `reg(25)` | 🥉 |
| Aposta no Inútil | Registre o Magikarp (#129). | `reg(129)` | 🥉 |
| Número Redondo | Registre #100, #500 e #1000. | `reg(100)&&reg(500)&&reg(1000)` | 🥈 |
| De Volta a 1996 | Complete os 151 de Kanto. | `regByGen(1) === 151` | 🥇 |

---

## 4. Dados extras necessários

### 4.1 Listas estáticas (arrays de números) — constantes JS perto de `POKEDEX_DATA`
Fonte recomendada: **Bulbapedia / PokéAPI** (categorias canônicas).

| Constante | Conteúdo (resumo) | Tamanho aprox. | Usada em |
|-----------|----------|----------------|----------|
| `LENDARIOS` | nº dos Lendários (144-146, 150, 243-245, 249-250, 377-384, 480-488, 638-646, 716-721, 888-898, 905, etc.) | ~70 | Conselho dos Lendários |
| `MITICOS` | 151, 251, 385, 386, 489-494, 647-649, 719-721, 801, 802, 807-809, 893 | ~22 | Caçador de Míticos |
| `INICIAIS_BASE` | 1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912 | 27 | O Professor Aprova |
| `INICIAIS_FINAIS` | 3,6,9,154,157,160,254,257,260,389,392,395,497,500,503,652,655,658,724,727,730,812,815,818,908,911,914 | 27 | Parceiros Evoluídos |
| `EEVEE_LINHA` | 133,134,135,136,196,197,470,471,700 | 9 | Mestre das Oito Faces |
| `PSEUDO_FINAIS` | 149,248,373,376,445,635,706,784,887,998 | 10 | Sangue de Pseudo-Lendário |
| `BEBES` | 172,173,174,175,236,238,239,240,298,360,406,433,438,439,440,446,447,458 | 18 | Diretor do Berçário |
| `FOSSEIS` | 138-142,345-348,408-411,564-567,696-699,880-883 | 25 | Paleontólogo Lendário |

> **Limitação confirmada:** os dados (`number/name/types/generation/region`) não têm flag de lendário/mítico/inicial/regional. As listas acima são a única forma de calcular esses grupos. **Variantes Regionais foi cortada** — `pokedexTracker` indexa por número nacional, então não dá pra distinguir "forma de Alola" da normal (conquista seria falsa).

### 4.2 Campos novos no doc Firestore (opcional, fase 2/3)
Salvar no mesmo doc `users/{uid}` com `{merge:true}`:
- `stats.sorteios` / `stats.sorteiosFullArt` (number) → grupo **Sorteador** (incrementar em `sortear()`). Conquistas: Primeiro Giro (1), Mão Quente (50), Rei da Roleta (250), Lenda da Sorte (1000), Garimpeiro Full Art (100).
- `history: [{num, date}]` → conquista de **streak de dias**. Custo maior (cresce sempre). Adiar / opcional.

---

## 5. Esboço de implementação no app atual

App single-file (`index.html`, JS embutido + Firebase compat).

### 5.1 Definição declarativa
```js
// perto de POKEDEX_DATA
const ACHIEVEMENTS = [
  { id:'jor-1', grupo:'Jornada', nome:'Saí de Pallet', tier:'bronze',
    desc:'Registre seu primeiro Pokémon.',
    target: 1, progress: () => totalReg(), secret:false },
  { id:'tipo-agua', grupo:'Tipos', nome:'Insígnia Cascata', tier:'diamante',
    desc:'Registre todos os 154 do tipo Água.',
    target: 154, progress: () => regByType('Água') },
  { id:'lend-conselho', grupo:'Temáticas', nome:'Conselho dos Lendários', tier:'diamante',
    desc:'Registre todos os Lendários.',
    target: LENDARIOS.length, progress: () => LENDARIOS.filter(reg).length },
  // ...todas as demais
];
```
`desbloqueada = progress() >= target`. Isso dá barra de progresso de graça.

### 5.2 Helpers (puros, sobre dados em memória)
```js
const reg = n => pokedexTracker[n] === true;
const totalReg = () => Object.values(pokedexTracker).filter(v => v === true).length;
const regByType = t => POKEDEX_DATA.filter(p => p.types?.includes(t) && reg(p.number)).length;
const regByGen  = g => POKEDEX_DATA.filter(p => p.generation === g && reg(p.number)).length;
const regByRegion = r => POKEDEX_DATA.filter(p => p.region === r && reg(p.number)).length;
```

### 5.3 Avaliação e persistência
- Estado: `users/{uid}.achievements = { 'tipo-agua': { unlockedAt }, ... }` (guarda só desbloqueadas; progresso é sempre recalculado em runtime). Carregar junto no `onSnapshot` e no load inicial.
- Gatilho: `evaluateAchievements()` chamada após cada mutação (dentro de `savePokedexEntry` e `saveCollectionEntry`) e uma vez no load.
```js
function evaluateAchievements() {
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlockedAch[a.id] && a.progress() >= a.target) {
      unlockedAch[a.id] = { unlockedAt: Date.now() };
      newly.push(a);
    }
  }
  if (newly.length) {
    db.collection('users').doc(currentUser.uid)
      .set({ achievements: unlockedAch }, { merge: true });
    newly.forEach(showAchievementToast);
  }
}
```
- `firestore.rules` já cobre o campo `achievements` (mesma regra do doc do usuário; nada a mudar).

### 5.4 Nova aba "Conquistas"
- Botão de aba no header (mesmo padrão das abas existentes) + `renderAchievements()`.
- Card desbloqueado = colorido + data; bloqueado = silhueta cinza + barra `progress()/target`; secreto bloqueado = "???".
- Reusar classes de card da aba Coleção.

### 5.5 Toast de desbloqueio
- Reusar o visual de "reveal" do `sortear()` (Pokébola/sparkles já existe). Empilhar se vários desbloquearem juntos.

---

## 6. Recompensas (sem economia no app)

1. **Insígnia visual** na Vitrine, com brilho do tier.
2. **Título exibível**: maior tier desbloqueado vira "título de treinador" no header (escolhível).
3. **Destaque na Pokédex**: selo dourado no cabeçalho do filtro completado ("Kanto ✅ 151/151").
4. **Moldura de avatar / cor de tema**: liberadas por tiers altos (cosmético, custo zero).
5. **Contador de prestígio**: "X/N insígnias" e "Y diamantes" — base para ranking social futuro.

---

## 7. Priorização

### MVP (fase 1) — alto valor, zero dado novo
- Infra: `ACHIEVEMENTS`, helpers, `evaluateAchievements()`, campo `achievements`, aba Conquistas, toast.
- **Grupo A** (Jornada), **B** (Gerações), **C** (Regiões), **D** (Tipos), **F** (Full Art), **H** (4 secretas calculáveis).
- Recompensas 1, 2 e 3.

### Fase 2 — exige listas estáticas (baixo esforço, alto sabor)
- **Grupo E** completo (8 arrays: Lendários, Míticos, Iniciais, Eevee, Pseudo, Bebês, Fósseis).
- Duais de tipo opcionais. Recompensas 4 e 5.

### Fase 3 — exige novos campos / instrumentação
- **Sorteador** (`stats.sorteios`). **Streak de dias** (`history`). Fichário por páginas (só se fixar 20 slots).

**Cortes deliberados:** Variantes Regionais (não distinguível — enganosa); marcos de 50% por geração individuais (redundantes); duais confusos ("Maré Híbrida"/"Céu Aberto"); tiers intermediários do Fichário (instáveis pelo `getSlotsPerPage` responsivo).

---

## 8. Sistema de ícones / SVG das insígnias

### 8.1 DECISÃO (2026-06-05): usar as insígnias OFICIAIS de ginásio + emblemas no mesmo espírito onde não existirem

Escolha de produto do Fellipe: usar o **desenho real das insígnias de ginásio Pokémon** (Boulder, Cascade, Thunder…) — máxima nostalgia e identidade. Ref.: insígnias canônicas do anime/jogos.

**Análise de encaixe (honesta):**
- ✅ **Mapeamento perfeito para o Grupo D (Tipos):** os ginásios SÃO por tipo. Cada um dos 18 tipos recebe a insígnia oficial do ginásio daquele tipo (Pedra→Boulder/Brock, Água→Cascade/Misty, etc. — tabela em 8.4). Recognição instantânea.
- ⚠️ **Cobertura parcial:** existem ~8 insígnias oficiais por região; elas **não cobrem** todas as ~90 conquistas. Não há insígnia oficial para "capturar 250", "todos os lendários" ou "Full Art". Logo, estratégia **HÍBRIDA**:
  - **Tipos (D)** → **insígnias OFICIAIS** (assets reais).
  - **Gerações/Regiões (B/C)** → opção A: o **conjunto das 8 insígnias oficiais da região** (lindo: "ganhe as 8 de Kanto"); opção B: medalha de Liga/Campeão. Decidir na implementação.
  - **Jornada, Temáticas, Full Art, Secretas** → **emblemas customizados no MESMO ESTILO** (moldura + glyph, técnica 8.2/8.3), pois não há insígnia oficial equivalente. Mantém o conjunto coeso.
- ⚠️ **Tipo Sombrio (Dark):** não tem ginásio clássico (Kanto-Hoenn). Usar Spikemuth/Piers (Galar) ou um emblema custom no estilo.
- **IP:** o desenho das insígnias é da Nintendo/Game Freak — mesma zona cinza dos sprites que o app já usa (PokeAPI); aceitável para app pessoal/sem fins comerciais; o rodapé já tem disclaimer.
- **Assets:** coletar ~18-25 imagens (Bulbapedia tem todas em PNG; SVGs livres existem para parte). **MVP** pode começar pelas **8 de Kanto** (as mais icônicas) + emblemas customizados no resto, e ir completando.

**Como o tier aparece com arte fixa:** como o desenho da insígnia oficial é fixo, o **tier** vira um **anel/moldura atrás da insígnia + glow** (bronze→diamante), não a cor da própria arte. Assim some o conflito "arte fixa × cor de tier".

> A técnica de 3 camadas abaixo (8.2/8.3) continua valendo — agora aplicada SÓ aos grupos sem insígnia oficial (Jornada, Temáticas, Full Art, Secretas) e ao anel de tier.

### 8.2 Moldura customizada + anel de tier (para grupos SEM insígnia oficial) — exemplo octogonal

```html
<svg viewBox="0 0 100 100" class="badge badge--gold" role="img" aria-label="Insígnia Cascata">
  <defs>
    <radialGradient id="tier-gold" cx="50%" cy="35%" r="75%">
      <stop offset="0%"  stop-color="#fff3b0"/>
      <stop offset="50%" stop-color="#ffcc33"/>
      <stop offset="100%" stop-color="#9a6b00"/>
    </radialGradient>
  </defs>

  <!-- moldura (octógono) -->
  <polygon class="frame"
    points="92.5,67.6 67.6,92.5 32.4,92.5 7.5,67.6 7.5,32.4 32.4,7.5 67.6,7.5 92.5,32.4"
    fill="url(#tier-gold)" stroke="#5e4300" stroke-width="2" stroke-linejoin="round"/>

  <!-- disco interno escuro + brilho -->
  <circle cx="50" cy="50" r="29" fill="#15151f"/>
  <ellipse cx="42" cy="40" rx="15" ry="9" fill="#ffffff" opacity="0.18"/>

  <!-- EMBLEMA (slot trocável) -->
  <g class="emblem" fill="#ffcc33" stroke="#15151f" stroke-width="0.5">
    <!-- ...glyph aqui... -->
  </g>
</svg>
```

### 8.3 Temas de tier (CSS — só troca o gradiente + glow)

```css
.badge .frame        { transition: filter .3s; }
.badge--bronze  .frame { fill: url(#tier-bronze); }   /* #d9a066 → #8a5a2b */
.badge--silver  .frame { fill: url(#tier-silver); }   /* #f0f0f5 → #9aa0ad */
.badge--gold    .frame { fill: url(#tier-gold); }     /* #ffcc33 → #9a6b00 */
.badge--platinum.frame { fill: url(#tier-platinum); } /* #e8f4ff → #9fc6e0 */
.badge--diamond .frame { fill: url(#tier-diamond); }  /* holográfico animado */

/* desbloqueada: brilho do tier */
.badge--unlocked { filter: drop-shadow(0 0 6px var(--tier-glow)); }

/* bloqueada: silhueta */
.badge--locked   { filter: grayscale(1) brightness(.4); opacity:.6; }

/* diamante: holográfico animado (hue-rotate suave) */
.badge--diamond.badge--unlocked .frame { animation: holo 4s linear infinite; }
@keyframes holo { to { filter: hue-rotate(360deg); } }
```

### 8.4 Mapeamento de arte

**(a) Grupo Tipos (D) → INSÍGNIA OFICIAL do ginásio daquele tipo** (asset real):

| Tipo (PT) | Insígnia oficial | Líder · Região |
|-----------|------------------|----------------|
| Pedra | Boulder Badge | Brock · Kanto |
| Água | Cascade Badge | Misty · Kanto |
| Elétrico | Thunder Badge | Lt. Surge · Kanto |
| Grama | Rainbow Badge | Erika · Kanto |
| Veneno | Soul Badge | Koga · Kanto |
| Psíquico | Marsh Badge | Sabrina · Kanto |
| Fogo | Volcano Badge | Blaine · Kanto |
| Terra | Earth Badge | Giovanni · Kanto |
| Normal | Plain Badge | Whitney · Johto |
| Inseto | Hive Badge | Bugsy · Johto |
| Fantasma | Fog Badge | Morty · Johto |
| Aço/Ferro | Mineral Badge | Jasmine · Johto |
| Gelo | Glacier Badge | Pryce · Johto |
| Dragão | Rising Badge | Clair · Johto |
| Lutador | Knuckle Badge | Brawly · Hoenn |
| Voador | Feather Badge | Winona · Hoenn |
| Fada | Fairy Badge | Valerie · Kalos |
| Sombrio | *(sem ginásio clássico)* | Spikemuth/Piers · Galar **ou emblema custom** |

> Confirmar o desenho exato ao coletar os assets (Bulbapedia). 17 tipos mapeiam limpo; Sombrio é a exceção.

**(b) Demais grupos → emblema customizado no mesmo estilo** (técnica 8.2/8.3):

| Grupo | Emblema base | Diferenciador |
|-------|--------------|----------------|
| Jornada | Pokébola | número do marco (1, 10, 100, 1025) |
| Geração | insígnias oficiais da região *(opção A)* ou Pokébola+nº | gen/região |
| Região | conjunto de insígnias da região ou pino de mapa | inicial da região |
| Temáticas | glyph bespoke (coroa, garra, ovo, fóssil, roda-Eevee) | — |
| Full Art | carta holográfica | — |
| Secretas | "?" até desbloquear, depois glyph próprio | — |

Exemplos de emblema (vão dentro do `<g class="emblem">`):

```html
<!-- Pokébola (Jornada/Geração) -->
<g class="emblem">
  <circle cx="50" cy="50" r="15" fill="#fff" stroke="#15151f" stroke-width="2.5"/>
  <path d="M35 50a15 15 0 0 1 30 0Z" fill="#e94560"/>
  <rect x="35" y="48.7" width="30" height="2.6" fill="#15151f"/>
  <circle cx="50" cy="50" r="4.5" fill="#fff" stroke="#15151f" stroke-width="2.5"/>
  <!-- <text x="50" y="78" ...>151</text> p/ geração -->
</g>

<!-- Gota (tipo Água) -->
<g class="emblem"><path d="M50 35 C58 47 62 53 62 59 a12 12 0 1 1-24 0 c0-6 4-12 12-24Z"
   fill="#4aa3ff" stroke="#15151f" stroke-width="1"/></g>

<!-- Pino de mapa (Região) -->
<g class="emblem"><path d="M50 36a10 10 0 0 0-10 10c0 7 10 20 10 20s10-13 10-20a10 10 0 0 0-10-10Z"
   fill="#ff6b6b"/><circle cx="50" cy="46" r="4" fill="#15151f"/></g>
```

### 8.5 MVP barato vs. polido
- **MVP**: as **8 insígnias oficiais de Kanto** (cobrem 8 tipos: Pedra/Água/Elétrico/Grama/Veneno/Psíquico/Fogo/Terra) + emblemas customizados (moldura octogonal + glyph) para Jornada/Full Art/Secretas + anel de tier por gradiente. Já fica lúdico e reconhecível.
- **Polido (fase 2)**: completar as insígnias oficiais de Johto/Hoenn/Kalos (demais tipos), resolver Sombrio, diamante holográfico e emblemas bespoke das temáticas.

> **Assets**: Bulbapedia tem todas as insígnias em PNG (fundo transparente). Salvar em `assets/badges/` (ex.: `boulder.png`, `cascade.png`) e referenciar no `ACHIEVEMENTS` por `badgeImg`. Onde não houver oficial, usar o SVG customizado inline.

---

## 9. Notificação de desbloqueio

### 9.1 Celebração proporcional ao tier (anti-fadiga)

Mostrar um modal cheio para CADA bronze cansa. Proposta de **2 níveis**:

| Tier | Como notifica |
|------|---------------|
| 🥉 Bronze / 🥈 Prata | **Toast de canto** (reusa o `showToast` já existente): a insígnia desliza, "Insígnia desbloqueada: **Nome**", 3s. Leve. |
| 🥇 Ouro / 💠 Platina / 💎 Diamante | **Modal de celebração** central: escurece o fundo, a insígnia "cai e cresce" com raio de luz + sparkles, "INSÍGNIA DESBLOQUEADA!", nome, tier e frase de sabor. Botão "Continuar". |

> Reaproveita a **animação de captura do Sorteador** (`pokeball-anim`, `sparkles`, `capture-flash`, classe `.reveal` — já existem). A insígnia entra no lugar do número sorteado.

### 9.2 Fila (múltiplos desbloqueios juntos)

Completar o #1025 dispara Mestre Pokémon **+** vários tipos/regiões de uma vez. Solução:

- `evaluateAchievements()` coleta TODAS as novas num array `newly[]`.
- Se `newly.length === 1` → mostra direto.
- Se `> 1` → modal **"combo"**: "🎉 +5 Insígnias!" com a lista em grid, e a de maior tier em destaque. Evita 5 modais empilhados.

```js
function queueAchievementUnlock(newly) {
  if (!newly.length) return;
  const top = newly.sort(byTierDesc)[0];
  if (newly.length === 1) {
    top.tierRank >= GOLD ? showUnlockModal(top) : showUnlockToast(top);
  } else {
    showComboModal(newly, top);   // destaque + grid das demais
  }
}
```

### 9.3 Esboço do modal (HTML/CSS)

```html
<div class="unlock-overlay" id="unlock-overlay">
  <div class="unlock-card">
    <div class="unlock-shine"></div>
    <div class="unlock-badge"><!-- SVG da insígnia (seção 8) --></div>
    <div class="unlock-label">INSÍGNIA DESBLOQUEADA!</div>
    <h2 class="unlock-name">Insígnia Cascata</h2>
    <div class="unlock-tier">💠 Platina · Tipo Água</div>
    <p class="unlock-flavor">Você dominou todos os 154 Pokémon de Água.</p>
    <button class="btn btn-gold" onclick="closeUnlock()">Continuar</button>
  </div>
</div>
```
```css
.unlock-badge { animation: badgeDrop .6s cubic-bezier(.2,1.4,.4,1); }
@keyframes badgeDrop { from{ transform:scale(0) rotate(-20deg); opacity:0 } to{ transform:scale(1); opacity:1 } }
.unlock-shine { /* faixa de luz que varre a insígnia */ animation: sweep 1.2s ease .4s; }
```

### 9.4 Onde dispara
`evaluateAchievements()` é chamada após cada mutação (`savePokedexEntry`, `saveCollectionEntry`) e uma vez no load. **No load inicial, NÃO celebrar** o que já estava desbloqueado (senão toda abertura vira festa) — só persistir; celebrar apenas o que desbloqueou *nesta sessão* (delta).

---

## 10. Tela de Conquistas (aba "Conquistas") — SIM, é o coração do acompanhamento

Sem uma tela de progresso, as conquistas viram surpresas invisíveis. A tela é o que cria o loop *"faltam 12 de Água, vou fechar"*. Layout proposto:

```
┌─────────────────────────────────────────────┐
│  CONQUISTAS              [ 34 / 92 insígnias ]│
│  🥉12  🥈9  🥇8  💠4  💎1     ▓▓▓▓▓░░░ 37%    │  ← resumo + anéis por tier
├─────────────────────────────────────────────┤
│  ⭐ QUASE LÁ                                   │  ← gancho de engajamento
│  ┌────────┐ ┌────────┐ ┌────────┐            │
│  │Cascata │ │ Kanto  │ │ Bosque │            │
│  │142/154 │ │148/151 │ │119/127 │            │
│  │▓▓▓▓▓▓░ │ │▓▓▓▓▓▓▓ │ │▓▓▓▓▓░░ │            │
│  └────────┘ └────────┘ └────────┘            │
├─────────────────────────────────────────────┤
│ [Tudo][Jornada][Gerações][Regiões][Tipos]... │  ← filtro por grupo (chips)
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │ 🏅 │ │ 🏅 │ │ 🔒 │ │ 🔒 │ │ ❓ │          │  ← grid de insígnias
│  │Pallet│ │ G1 │ │Água│ │Drag│ │ ?? │         │
│  │ ✓   │ │ ✓  │ │142/│ │ 41/│ │secr│         │
│  └────┘ └────┘ └154─┘ └70─┘ └────┘          │
└─────────────────────────────────────────────┘
```

**Componentes:**
1. **Cabeçalho**: "X / N insígnias", barra de % global, e contadores por tier (🥉🥈🥇💠💎). Opcional: o **título de treinador** ativo (maior tier).
2. **"Quase lá"** (destaque): as 3-5 conquistas **mais próximas** de desbloquear (maior `progress/target` ainda < 100%). Ordenadas por proximidade. É o maior motor de retorno.
3. **Filtro por grupo** (chips): Tudo · Jornada · Gerações · Regiões · Tipos · Temáticas · Full Art · Fichário · Secretas.
4. **Grid de cards de insígnia**:
   - Desbloqueada → colorida (tier) + ✓ + data.
   - Bloqueada → silhueta cinza + **barra `142/154`**.
   - Secreta bloqueada → "❓" + "Conquista secreta".
5. **Detalhe ao tocar** (modal): insígnia grande, descrição, progresso exato e — para conquistas de completar conjunto — a **lista do que falta** ("Faltam: Lapras, Vaporeon, Kingler…") com link para filtrar a Pokédex. Isso **fecha o loop** conquista ↔ Pokédex e é altamente acionável.

**Reuso técnico**: o grid e os cards reaproveitam classes da aba Coleção; a barra de progresso reaproveita a `.progress-bar`/`.progress-fill` já usada no topo da aba Pokédex.

---

## 11. Resumo de implementação adicional (sobre as seções 8-10)

| Peça | Esforço | Reuso |
|------|---------|-------|
| Moldura SVG + 5 temas de tier | baixo | — |
| Emblemas MVP (Pokébola, gota, pino) | baixo | — |
| 18 símbolos de tipo (SVG) | médio (fase 2) | set externo livre |
| Toast de desbloqueio (bronze/prata) | baixo | `showToast()` já existe |
| Modal de celebração (ouro+) | médio | animação do `sortear()` (`pokeball-anim`/`sparkles`) |
| Fila/combo de múltiplos | baixo | — |
| Aba Conquistas (grid + filtro + barras) | médio | cards da Coleção, `.progress-bar` da Pokédex |
| "Quase lá" + detalhe c/ "o que falta" | médio | filtros da Pokédex |

---

## 12. DE×PARA CONGELADO — Grupo D (Tipos) ✅ aprovado por Fellipe (2026-06-06)

18 insígnias, **todas distintas** (sem repetição). Assets via Fandom (static.wikia.nocookie.net).

| Tipo | Conquista | Insígnia | Origem | Obs. |
|------|-----------|----------|--------|------|
| Água | Insígnia Cascata | Cascade Badge | Kanto · Misty | |
| Normal | Insígnia Equilíbrio | Plain Badge | Johto · Whitney | |
| Grama | Insígnia Bosque | Rainbow Badge | Kanto · Erika | |
| Voador | Insígnia Brisa | Zephyr Badge | Johto · Falkner | |
| Psíquico | Insígnia Mente | Marsh Badge | Kanto · Sabrina | |
| Inseto | Insígnia Casulo | Hive Badge | Johto · Bugsy | |
| Veneno | Insígnia Toxina | Soul Badge | Kanto · Koga | |
| Fogo | Insígnia Brasa | Volcano Badge | Kanto · Blaine | |
| Terra | Insígnia Terremoto | Earth Badge | Kanto · Giovanni | |
| Pedra | Insígnia Penhasco | Boulder Badge | Kanto · Brock | |
| Lutador | Insígnia Punho | Storm Badge | Johto · Chuck | |
| Dragão | Insígnia Ascensão | Rising Badge | Johto · Clair | |
| Elétrico | Insígnia Trovão | Thunder Badge | Kanto · Lt. Surge | |
| **Sombrio** | Insígnia Eclipse | **Psychic Badge** | Kalos · Olympia | escolha estética (não pelo tipo) |
| Fantasma | Insígnia Assombração | Fog Badge | Johto · Morty | |
| Aço | Insígnia Engrenagem | Mineral Badge | Johto · Jasmine | |
| **Fada** | Insígnia Encanto | **Coral-Eye Badge** | Liga Laranja (anime) | escolha estética; asset a coletar |
| Gelo | Insígnia Geleira | Glacier Badge | Johto · Pryce | |

> Reservadas para o Grupo D — **não reutilizar** estas 18 nos outros grupos. Pendência de asset: confirmar imagem da **Coral-Eye Badge** (Liga Laranja).
> Ferramenta de escolha gerada: `escolher_tipos.html` (seletor por tipo). Quadro geral: `conquistas_depara.html`.

---

## 13. Componente visual CONGELADO — Troféu (estilo TCG Pocket) ✅ aprovado 2026-06-06

Decisão: **NÃO usar render 3D/WebGL** (testado em `trofeus_3d.html`, descartado por peso/estética). Usar o **troféu vetorial SVG** — referência viva em **`trofeus_preview.html`**.

**Anatomia (frame único, miolo troca por grupo):**
```
TROFÉU = brilho de fundo + [ esfera de vidro (cor=tema) com miolo  |  taça ]
         + aro metálico c/ rebites + coroa de louros + haste/colar
         + plinto de pedra escura (canelado + aro + plaqueta c/ gema + degrau)
         + sombra de contato
```
- **Miolo da esfera**: insígnia real (tipos) · arte do lendário (gerações) · taça SVG (marcos).
- **Cor da esfera** = tema/tipo; **metal do aro+plinto** = tier.
- **Coroa de louros**: dourada ao redor do orbe (aprovada; pode ligar só em tiers altos se quiser).
- **Detalhes aprovados**: núcleo luminoso + luz de borda no vidro, 10 rebites no aro, coluna canelada, gema facetada na plaqueta, colar de 3 anéis, sparkles, drop-shadow.

**Tiers (metal):** 🥉 bronze · 🥈 prata · 🥇 ouro · 💎 **diamante = roxo ametista imponente, estático** (aura roxa via drop-shadow; sem hue-rotate). Sem platina.

**Implementação no app:** gerar o SVG via função única (como em `trofeus_preview.html`: `trophy({tier, orb, inner|kind})`). Para as ~90 conquistas no grid, render SVG inline é leve. Imagens internas (insígnias Fandom / artes PokeAPI) hotlinkam com CORS `*` — OK como `<image>`/`<img>`.

---

## 14. DE×PARA CONGELADO — Regiões (FUNDE o antigo Grupo B Gerações) ✅ aprovado 2026-06-08

**Decisão Fellipe:** Gerações e Regiões eram quase idênticas → **fundidas num único grupo "Regiões"** (10 regiões, Hisui separado de Galar). Cada região = um troféu com um **Pokémon lendário/raro** dentro da esfera (esfera na cor da região). O antigo **Grupo B (Gerações) é descartado**; estas 10 conquistas o substituem.

**Tier por % de captura da região:** 🥉 25% · 🥈 50% · 🥇 75% · 💎 100%. Ferramenta: `escolher_regioes.html`.

| Região | Lendário escolhido | #dex | Total | 🥉 25% | 🥈 50% | 🥇 75% | 💎 100% |
|--------|--------------------|------|-------|--------|--------|--------|---------|
| Kanto | **Mew** | 151 | 151 | 38 | 76 | 114 | 151 |
| Johto | **Ho-Oh** | 250 | 100 | 25 | 50 | 75 | 100 |
| Hoenn | **Rayquaza** | 384 | 135 | 34 | 68 | 102 | 135 |
| Sinnoh | **Arceus** | 493 | 107 | 27 | 54 | 81 | 107 |
| Unova | **Zekrom** | 644 | 156 | 39 | 78 | 117 | 156 |
| Kalos | **Yveltal** | 717 | 72 | 18 | 36 | 54 | 72 |
| Alola | **Lunala** | 792 | 88 | 22 | 44 | 66 | 88 |
| Galar | **Eternatus** | 890 | 89 | 23 | 45 | 67 | 89 |
| Hisui | **Enamorus** | 905 | 7 | 2 | 4 | 6 | 7 |
| Paldea | **Miraidon** | 1008 | 120 | 30 | 60 | 90 | 120 |

> 10 lendários **distintos** (sem repetição). Arte via PokeAPI official-artwork (`/sprites/pokemon/other/official-artwork/<dex>.png`).
> **Agregadoras herdadas das gerações (re-baseadas em região, a revisar):** "Primeiro Ginásio" → completar 1 região; "Equilibrista das Eras" → ≥50% em todas as 10; "Lenda Viva / Cartógrafo Supremo" → 100% das 10 (= 1025).

---

## 15. CONGELADO — Jornada (4 Poké Balls) ✅ 2026-06-08

4 conquistas por **total de Pokémon registrados** (`totalReg ≥ N`, qualquer um conta). Ícone = a Poké Ball desenhada (SVG) dentro da esfera; tier fixo por marco. Ref.: `jornada_trofeus.html`.

| Conquista | Bola | totalReg ≥ | Tier |
|-----------|------|-----------|------|
| Treinador Novato | Poké Ball (vermelha) | 100 | 🥉 |
| Treinador Experiente | Great Ball (azul + asas vermelhas) | 350 | 🥈 |
| Treinador de Elite | Ultra Ball (amarela + bloco preto) | 700 | 🥇 |
| Mestre Pokémon | Master Ball (roxa + M) | 1025 (todos) | 💎 |

## 16. CONGELADO — Temáticas (coleções icônicas) ✅ 2026-06-08

Capturar TODOS de um conjunto canônico. **Exige listas estáticas** (arrays de nº nacional — ver seção 4.1). Ícone = Pokémon representativo. Ref.: `tematicas_trofeus.html`.

| Conquista | Representante | Conjunto | Lista | Tier |
|-----------|---------------|----------|-------|------|
| Mestre dos Iniciais | Charmander | 27 iniciais base | INICIAIS_BASE | 🥇 |
| Mestre das Oito Faces | Eevee | Eevee + 8 (9) | EEVEE_LINHA | 🥇 |
| Diretor do Berçário | Togepi | ~18 bebês | BEBES | 🥇 |
| Paleontólogo | Aerodactyl | ~25 fósseis | FOSSEIS | 💎 |
| Sangue Pseudo-Lendário | Dragonite | 10 pseudo finais | PSEUDO_FINAIS | 💎 |
| Caçador de Míticos | Jirachi | ~22 míticos | MITICOS | 💎 |
| Conselho dos Lendários | Mewtwo | todos ~70 lendários | LENDARIOS | 💎 |

## 17. CONGELADO — Full Art (aba Coleção) ✅ 2026-06-08

Sobre `collection`. Números reais: **690 Pokémon têm Full Art**, 3000 cartas. Ícone = carta holográfica. Ref.: `fullart_trofeus.html`.

- **Colecionador Full Art** (tiered por % dos 690): 🥉 ≥173 · 🥈 ≥345 · 🥇 ≥518 · 💎 690.
- **Ilustração Especial** — 20 cartas Special Illustration Rare — 🥇
- **Caçador de Hyper Rare** — 10 cartas Hyper Rare — 🥇
- **As Coroas Mega** — as 6 Mega Hyper Rare (todas que existem) — 💎

> **Cortados** (inviáveis/redundantes): "Obsessão por Charizard" (app guarda 1 carta por Pokémon, não quantidade); "Visto e Possuído"/"Espelho Perfeito" (a auto-marcação Coleção→Pokédex os torna sempre verdadeiros).

## 18. CONGELADO — Secretas (8) ✅ 2026-06-08

Aparecem como **"???"** até desbloquear (reaproveitar reveal do sorteador). Ref.: `secretas_trofeus.html`.

| Conquista | Gatilho | Ícone | Tier |
|-----------|---------|-------|------|
| Escolhi Você! | registre Pikachu (#025) | Pikachu | 🥉 |
| Aposta no Inútil | registre Magikarp (#129) | Magikarp | 🥉 |
| O Primeiro de Todos | registre #001 | Bulbasaur | 🥉 |
| O Último de Todos | registre #1025 | Pecharunt | 🥉 |
| O Milésimo | registre #1000 | Gholdengo | 🥈 |
| Clone e Original | registre Mew (151) **e** Mewtwo (150) | Mewtwo+Mew | 🥈 |
| De Volta a 1996 | complete os 151 de Kanto | Gengar | 🥇 |
| Tesouro Secreto | registre 1 carta **Rare Secret** na Coleção | Gimmighoul (#999) | 🥈 |

> **Cortadas**: "As Aves Ancestrais"; "Número Redondo" (Unown não renderizava bem em alta resolução com CORS).

---

## ✅ RESUMO — todos os grupos fechados (2026-06-08)
Tipos (18, §12) · Regiões (10, §14, funde Gerações) · Jornada (4, §15) · Temáticas (7, §16) · Full Art (4, §17) · Secretas (8, §18). Componente de troféu congelado §13. Próximo: **implementar MVP** (motor `evaluateAchievements` retroativo + aba Conquistas + notificação em camadas).
