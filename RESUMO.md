# Pokedex — Pokemon TCG

Conjunto de scripts para montar uma Pokedex completa com dados do [Liga Pokemon](https://www.ligapokemon.com.br) e cartas Full Art via [pokemontcg.io API](https://pokemontcg.io/).

## Funcionalidades

- **Pokedex completa**: extrai todos os Pokemon do site Liga Pokemon (numero nacional, nome PT-BR/EN, tipo(s), geracao, regiao)
- **Catalogo Full Art**: coleta todas as cartas com raridades "full art" (Illustration Rare, Special Illustration Rare, Ultra Rare, Hyper Rare, etc.) da API pokemontcg.io v2
- **HTML interativo**: visualizador de cartas Full Art gerado automaticamente (`fullart_pokedex.html`)
- **Planilha Excel**: dados da Pokedex exportados em planilha formatada
- **Progresso incremental**: scraper salva progresso e retoma de onde parou

## Scripts

| Arquivo | Descricao |
|---------|-----------|
| `pokedex_scraper.py` | **Scraper principal** — extrai dados de todos os Pokemon da Pokedex do Liga Pokemon + gera planilha Excel |
| `pokedex_descobrir.py` | Analisa estrutura do DOM da pagina de Pokedex do Liga Pokemon (usado no desenvolvimento) |
| `fullart_scraper.py` | Coleta cartas Full Art da API pokemontcg.io v2 e gera `fullart_cards.json` |
| `fullart_pokedex.html` | **Visualizador HTML** — pagina interativa para navegar pelas cartas Full Art coletadas |

## Como rodar

```bash
# Pokedex (Liga Pokemon — abre Chrome)
python D:\claude_projects\app_pokemon\pokedex\pokedex_scraper.py

# Full Art (API — sem Chrome, apenas HTTP)
python D:\claude_projects\app_pokemon\pokedex\fullart_scraper.py

# Visualizar catalogo Full Art
# Abrir fullart_pokedex.html no navegador
```

## Dados gerados

| Arquivo | Conteudo |
|---------|----------|
| `pokedex_dados.json` | Dados completos da Pokedex (numero, nomes, tipos, geracao, regiao) |
| `pokedex_estrutura.json` | Estrutura do DOM da Pokedex (referencia tecnica) |
| `fullart_cards.json` | Todas as cartas Full Art da API (~1.5MB) |
| `fullart_pokedex.html` | Visualizador HTML interativo |
| `planilhas/Pokedex_LigaPokemon_*.xlsx` | Planilha Excel formatada |

## Estrutura de pastas

```
pokedex/
├── pokedex_scraper.py         # Scraper Pokedex Liga Pokemon
├── pokedex_descobrir.py       # Descoberta estrutura DOM
├── fullart_scraper.py         # Coletor Full Art (API)
├── fullart_pokedex.html       # Visualizador HTML interativo
├── pokedex_dados.json         # Dados da Pokedex
├── pokedex_estrutura.json     # Estrutura DOM (referencia)
├── fullart_cards.json         # Dados Full Art (~1.5MB)
├── planilhas/                 # Planilhas geradas
│   └── Pokedex_LigaPokemon_*.xlsx
└── RESUMO.md
```

## Stack

- **Pokedex scraper**: Python 3.13 + Selenium 4.41 + openpyxl + ChromeDriver
- **Full Art scraper**: Python 3.13 + urllib (sem Selenium — usa API REST diretamente)
- ChromeDriver: `~/.wdm/drivers/chromedriver/win64/146.0.7680.165/chromedriver-win32/chromedriver.exe`

## Raridades Full Art coletadas

- Illustration Rare
- Special Illustration Rare
- Double Rare
- Ultra Rare
- Rare Holo VMAX / V / VSTAR / GX / EX
- Hyper Rare
- Rare Secret / Rainbow / Ultra
- ACE SPEC Rare

## Pendencias

- [ ] Expandir Pokedex com dados adicionais (habilidades, stats base)
- [ ] Filtros no visualizador HTML (por tipo, geracao, raridade)
- [ ] Cruzar Full Art com Pokedex (quais Pokemon tem carta Full Art)
