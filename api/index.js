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
    locale = 'en',  // Definimos 'en' como padrão se o locale não for especificado
    disable_animations,
    border_radius,
    number_format,
    border_color,
    rank_icon,
    show,
    render_type, // Novo parâmetro para verificar se o tipo é SVG ou HTML
  } = req.query;

  // Verifica se o conteúdo deve ser SVG ou HTML
  const isSVG = render_type === 'svg';

  // Configura o cabeçalho correto com base no tipo de conteúdo
  if (isSVG) {
    res.setHeader("Content-Type", "image/svg+xml");
  } else {
    res.setHeader("Content-Type", "text/html");
  }

  if (blacklist.includes(username)) {
    if (isSVG) {
      return res.send(
        renderError("Something went wrong", "This username is blacklisted", {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        }),
      );
    } else {
      return res.send(`
        <html>
          <body>${renderError("Something went wrong", "This username is blacklisted")}</body>
        </html>
      `);
    }
  }

  if (locale && !isLocaleAvailable(locale)) {
    if (isSVG) {
      return res.send(
        renderError("Something went wrong", "Language not found", {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        }),
      );
    } else {
      return res.send(`
        <html>
          <body>${renderError("Something went wrong", "Language not found")}</body>
        </html>
      `);
    }
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

    if (isSVG) {
      // Retorna o SVG
      return res.send(
        renderStatsCard(stats, {
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
        }),
      );
    } else {
      // Retorna o HTML com o dropdown de idioma
      return res.send(`
        <html>
          <body>
            <div>
              <!-- Aqui você pode renderizar uma prévia ou informação adicional -->
              <h1>Card de Estatísticas</h1>
              <p>Escolha o idioma para visualizar o cartão:</p>
              <!-- Adiciona o drop-down para selecionar o idioma -->
              <label for="languageSelector">Escolha o idioma:</label>
              <select id="languageSelector">
                <option value="en" ${locale === 'en' ? 'selected' : ''}>Inglês</option>
                <option value="pt-br" ${locale === 'pt-br' ? 'selected' : ''}>Português</option>
                <option value="fr" ${locale === 'fr' ? 'selected' : ''}>Francês</option>
                <option value="es" ${locale === 'es' ? 'selected' : ''}>Espanhol</option>
                <option value="de" ${locale === 'de' ? 'selected' : ''}>Alemão</option>
                <option value="pl" ${locale === 'pl' ? 'selected' : ''}>Polonês</option>
                <option value="ru" ${locale === 'ru' ? 'selected' : ''}>Russo</option>
                <option value="ar" ${locale === 'ar' ? 'selected' : ''}>Árabe</option>
                <option value="ja" ${locale === 'ja' ? 'selected' : ''}>Japonês</option>
                <option value="cn" ${locale === 'cn' ? 'selected' : ''}>Chinês</option>
                <option value="np" ${locale === 'np' ? 'selected' : ''}>Nepalês</option>
              </select>

              <!-- Script para manipular o SVG -->
              <script>
                function atualizarIdioma() {
                  const languageOption = document.getElementById('languageSelector').value;
                  const urlParams = new URLSearchParams(window.location.search);
                  urlParams.set('locale', languageOption);
                  window.location.search = urlParams.toString();
                }

                document.getElementById('languageSelector').addEventListener('change', atualizarIdioma);
              </script>
            </div>
          </body>
        </html>
      `);
    }
  } catch (err) {
    res.setHeader(
      "Cache-Control",
      `max-age=${CONSTANTS.ERROR_CACHE_SECONDS / 2}, s-maxage=${
        CONSTANTS.ERROR_CACHE_SECONDS
      }, stale-while-revalidate=${CONSTANTS.ONE_DAY}`,
    );

    if (isSVG) {
      return res.send(
        renderError(err.message, err.secondaryMessage, {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        }),
      );
    } else {
      return res.send(`
        <html>
          <body>
            ${renderError(err.message, err.secondaryMessage)}
          </body>
        </html>
      `);
    }
  }
};
