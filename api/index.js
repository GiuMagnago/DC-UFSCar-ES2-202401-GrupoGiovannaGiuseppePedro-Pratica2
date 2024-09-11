import { renderStatsCard } from "../src/cards/stats-card.js";
import { blacklist } from "../src/common/blacklist.js";
import {
  clampValue,
  CONSTANTS,
  parseArray,
  parseBoolean,
  renderError,
} from "../src/common/utils.js";
import { fetchStats } from "../src/fetchers/stats-fetcher.js";
import { isLocaleAvailable } from "../src/translations.js";

export default async (req, res) => {
  const {
    username,
    hide,
    hide_title,
    hide_border,
    card_width,
    hide_rank,
    show_icons,
    include_all_commits,
    line_height,
    title_color,
    ring_color,
    icon_color,
    text_color,
    text_bold,
    bg_color,
    theme,
    cache_seconds,
    exclude_repo,
    custom_title,
    locale,
    disable_animations,
    border_radius,
    number_format,
    border_color,
    rank_icon,
    show,
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
    return res.send(`<html><body>${renderError("Something went wrong", "Language not found")}</body></html>`);
  }

  try {
    const showStats = parseArray(show);
    const stats = await fetchStats(
      username,
      parseBoolean(include_all_commits),
      parseArray(exclude_repo),
      showStats.includes("prs_merged") ||
        showStats.includes("prs_merged_percentage"),
      showStats.includes("discussions_started"),
      showStats.includes("discussions_answered"),
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

    // Retorna o SVG dentro de uma estrutura HTML com um dropdown para selecionar idioma
    return res.send(`
      <html>
        <body>
          <div>
            ${renderStatsCard(stats, {
              hide: parseArray(hide),
              show_icons: parseBoolean(show_icons),
              hide_title: parseBoolean(hide_title),
              hide_border: parseBoolean(hide_border),
              card_width: parseInt(card_width, 10),
              hide_rank: parseBoolean(hide_rank),
              include_all_commits: parseBoolean(include_all_commits),
              line_height,
              title_color,
              ring_color,
              icon_color,
              text_color,
              text_bold: parseBoolean(text_bold),
              bg_color,
              theme,
              custom_title,
              border_radius,
              border_color,
              number_format,
              locale: locale ? locale.toLowerCase() : null,
              disable_animations: parseBoolean(disable_animations),
              rank_icon,
              show: showStats,
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
            function atualizarIdioma() {
              // Seleciona o SVG
              const svg = document.querySelector('svg'); // Assume que o SVG é o único na página
              const languageOption = document.getElementById('languageSelector').value;

              // Recarrega a página com o novo idioma selecionado
              const urlParams = new URLSearchParams(window.location.search);
              urlParams.set('locale', languageOption);
              window.location.search = urlParams.toString();
            }

            // Adiciona o evento de mudança ao drop-down
            document.getElementById('languageSelector').addEventListener('change', atualizarIdioma);
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
    ); // Use lower cache period for errors.

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
