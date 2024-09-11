import { renderTopLanguages } from "../src/cards/top-languages-card.js";
import { blacklist } from "../src/common/blacklist.js";
import {
  clampValue,
  CONSTANTS,
  parseArray,
  parseBoolean,
  renderError,
} from "../src/common/utils.js";
import { fetchTopLanguages } from "../src/fetchers/top-languages-fetcher.js";
import { isLocaleAvailable } from "../src/translations.js";

export default async (req, res) => {
  const {
    username,
    hide,
    hide_title,
    hide_border,
    card_width,
    title_color,
    text_color,
    bg_color,
    theme,
    cache_seconds,
    layout,
    langs_count,
    exclude_repo,
    size_weight,
    count_weight,
    custom_title,
    locale,
    border_radius,
    border_color,
    disable_animations,
    hide_progress,
  } = req.query;

  // Define o cabeçalho como HTML
  res.setHeader("Content-Type", "text/html");

  if (blacklist.includes(username)) {
    return res.send(
      `<html><body>${renderError(
        "Something went wrong",
        "This username is blacklisted", 
        {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        })}</body></html>`
    );
  }

  if (locale && !isLocaleAvailable(locale)) {
    return res.send(`<html><body>${renderError("Something went wrong", "Locale not found")}</body></html>`);
  }

  if (
    layout !== undefined &&
    (typeof layout !== "string" ||
      !["compact", "normal", "donut", "donut-vertical", "pie"].includes(layout))
  ) {
    return res.send(`<html><body>${renderError("Something went wrong", "Incorrect layout input")}</body></html>`);
  }

  try {
    const topLangs = await fetchTopLanguages(
      username,
      parseArray(exclude_repo),
      size_weight,
      count_weight,
    );

    let cacheSeconds = clampValue(
      parseInt(cache_seconds || CONSTANTS.CARD_CACHE_SECONDS, 10),
      CONSTANTS.SIX_HOURS,
      CONSTANTS.ONE_DAY,
    );
    cacheSeconds = process.env.CACHE_SECONDS
      ? parseInt(process.env.CACHE_SECONDS, 10) || cacheSeconds
      : cacheSeconds;

    res.setHeader(
      "Cache-Control",
      `max-age=${
        cacheSeconds / 2
      }, s-maxage=${cacheSeconds}, stale-while-revalidate=${CONSTANTS.ONE_DAY}`,
    );

    // Retorna o SVG dentro de uma estrutura HTML
    return res.send(`
      <html>
        <body>
          <div>
            ${renderTopLanguages(topLangs, {
              custom_title,
              hide_title: parseBoolean(hide_title),
              hide_border: parseBoolean(hide_border),
              card_width: parseInt(card_width, 10),
              hide: parseArray(hide),
              title_color,
              text_color,
              bg_color,
              theme,
              layout,
              langs_count,
              border_radius,
              border_color,
              locale: locale ? locale.toLowerCase() : null,
              disable_animations: parseBoolean(disable_animations),
              hide_progress: parseBoolean(hide_progress),
            })}

            <!-- Adiciona o drop-down para selecionar o idioma -->
            <label for="languageSelector">Escolha o idioma:</label>
            <select id="languageSelector">
              <option value="en">Inglês</option> <!-- Inglês -->
              <option value="pt">Português</option> <!-- Português -->
              <option value="fr">Francês</option> <!-- Francês -->
              <option value="es">Espanhol</option> <!-- Espanhol -->
              <option value="de">Alemão</option> <!-- Alemão -->
              <option value="pl">Polonês</option> <!-- Polonês -->
              <option value="ru">Russo</option> <!-- Russo -->
              <option value="ar">Árabe</option> <!-- Árabe -->
              <option value="ja">Japonês</option> <!-- Japonês -->
              <option value="cn">Chinês</option> <!-- Chinês -->
              <option value="np">Nepalês</option> <!-- Nepalês -->
            </select>
          </div>

          <!-- Script para manipular o SVG -->
          <script>
            // Função para atualizar o título do langcard com base na seleção de idioma
            function atualizarTituloIdioma() {
              // Seleciona o SVG
              const svg = document.querySelector('svg'); // Assume que o SVG é o único na página
                
              // Seleciona o elemento <text> que representa o título (assumindo que é o primeiro elemento <text>)
              const titulo = svg.querySelector('text'); // Você pode ajustar o seletor se necessário
                
              // Verifica a seleção do drop-down (inglês ou português)
              const languageOption = document.getElementById('languageSelector').value;

              // Atualiza o título de acordo com a seleção de idioma
              if (languageOption === 'en') {
                titulo.textContent = "Most Used Languages";
              } if (languageOption === 'pt') {
                titulo.textContent = "Linguagens Mais Usadas";
              } if (languageOption === 'fr') {
                titulo.textContent = "Langages les plus utilisés";
              } if (languageOption === 'es') {
                titulo.textContent = "Lenguajes más usados";
              } if (languageOption === 'de') {
                titulo.textContent = "Meist verwendete Sprache";
              } if (languageOption === 'pl') {
                titulo.textContent = "Najczęściej używane języki";
              } if (languageOption === 'ru') {
                titulo.textContent = "Наиболее часто используемые языки";
              } if (languageOption === 'ar') {
                titulo.textContent = "أكثر اللغات إستخداماً";
              } if (languageOption === 'ja') {
                titulo.textContent = "最もよく使っている言語";
              } if (languageOption === 'cn') {
                titulo.textContent = "最常用的语言";
              } if (languageOption === 'np') {
                titulo.textContent = "अधिक प्रयोग गरिएको भाषाहरू";
              }
            }

            // Adiciona o evento de mudança ao drop-down
            document.getElementById('languageSelector').addEventListener('change', atualizarTituloIdioma);
            
            // Chama a função para atualizar o título ao carregar a página
            atualizarTituloIdioma();
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.setHeader(
      "Cache-Control",
      `max-age=${CONSTANTS.ERROR_CACHE_SECONDS / 2}, s-maxage=${
        CONSTANTS.ERROR_CACHE_SECONDS
      }, stale-while-revalidate=${CONSTANTS.ONE_DAY}`,
    );

    // Retorna o erro também dentro de uma estrutura HTML
    return res.send(`
      <html>
        <body>
          ${renderError(err.message, err.secondaryMessage, {
            title_color,
            text_color,
            bg_color,
            border_color,
            theme,
          })}
        </body>
      </html>
    `);
  }
};