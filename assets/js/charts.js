/* WeBrain — gráficos em SVG puro.
   Regras aplicadas: um eixo só, marcas finas, grade recessiva, rótulo direto
   quando cabe, legenda sempre que houver duas ou mais séries, separador de
   2px entre segmentos empilhados, e uma visão em tabela para cada gráfico.
   A paleta de série (--s1..--s4) é validada para daltonismo nos dois temas;
   a legenda e os rótulos são a codificação secundária obrigatória. */
(function () {
  const WB = (window.WB = window.WB || {});
  const esc = WB.esc;

  const SERIES = ['s1', 's2', 's3', 's4'];

  function idUnico(p) { return p + '_' + Math.random().toString(36).slice(2, 8); }

  /** Visão em tabela — sempre disponível ao lado de cada gráfico. */
  function tabela(colunas, linhas) {
    return `<div class="tbl__wrap"><table class="tbl">
      <thead><tr>${colunas.map((c, i) => `<th${i ? ' class="tbl__num"' : ''}>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${linhas.map((l) => `<tr>${l.map((v, i) => `<td${i ? ' class="tbl__num"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  /**
   * Envolve um gráfico com o alternador "Gráfico / Tabela".
   * O botão é real: o mesmo dado, em duas leituras.
   */
  WB.comTabela = function (svgHtml, legendaHtml, colunas, linhas) {
    const id = idUnico('cv');
    return `<div class="chartwrap" data-chart="${id}">
      <div class="inline" style="justify-content:flex-end;padding:10px 16px 0">
        <div class="seg" role="group" aria-label="Forma de leitura">
          <button type="button" data-ver="grafico" aria-pressed="true">Gráfico</button>
          <button type="button" data-ver="tabela" aria-pressed="false">Tabela</button>
        </div>
      </div>
      <div data-painel="grafico">${svgHtml}${legendaHtml || ''}</div>
      <div data-painel="tabela" hidden>${tabela(colunas, linhas)}</div>
    </div>`;
  };

  /** Liga os alternadores presentes em um container já inserido no DOM. */
  WB.ligarGraficos = function (root) {
    WB.$$('.chartwrap', root).forEach((w) => {
      w.querySelectorAll('[data-ver]').forEach((b) => {
        b.addEventListener('click', () => {
          const alvo = b.dataset.ver;
          w.querySelectorAll('[data-ver]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ver === alvo)));
          w.querySelectorAll('[data-painel]').forEach((p) => { p.hidden = p.dataset.painel !== alvo; });
        });
      });
    });
  };

  function legenda(itens) {
    if (itens.length < 2) return '';
    return `<div class="legend">${itens.map((i) =>
      `<span class="legend__i"><i class="legend__sw ${i.serie}"></i>${esc(i.rotulo)}</span>`).join('')}</div>`;
  }
  WB.legenda = legenda;

  /* ------------------------------------------------------ barras horizontais
     Para magnitude comparada entre poucas categorias nomeadas.
     Série única = sem legenda; o título do cartão já nomeia a medida.        */
  WB.barras = function (dados, opts) {
    const o = opts || {};
    // Coordenadas em pixel: o SVG escala junto com o cartão, mas texto e raio
    // continuam proporcionais ao que foi desenhado.
    const W = 560, LINHA = 34, ROTULO = 150, VALOR = 92;
    const trilho = W - ROTULO - VALOR - 16;
    const max = Math.max(...dados.map((d) => d.valor), 1);
    const H = dados.length * LINHA + 10;
    const corta = (t) => (String(t).length > 24 ? String(t).slice(0, 23) + '…' : String(t));

    const linhas = dados.map((d, i) => {
      const y = i * LINHA + 5;
      const w = Math.max((d.valor / max) * trilho, 2);
      const cor = o.porSerie ? `var(--${d.serie || SERIES[i % 4]})` : 'var(--brand-slate)';
      const txt = o.formatar ? o.formatar(d.valor) : String(d.valor);
      return `<g>
        <title>${esc(d.rotulo)}: ${esc(txt)}</title>
        <text x="0" y="${y + 14}" dominant-baseline="middle">${esc(corta(d.rotulo))}</text>
        <rect class="mark" x="${ROTULO}" y="${y + 7}" width="${w}" height="14" rx="4" fill="${cor}"/>
        <text class="chart__val" x="${ROTULO + w + 8}" y="${y + 14}" dominant-baseline="middle">${esc(txt)}</text>
      </g>`;
    }).join('');

    const svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(o.descricao || 'Gráfico de barras')}" preserveAspectRatio="xMinYMin meet"
      style="height:${H}px;max-height:${H}px;padding:0 16px">${linhas}</svg>`;

    return WB.comTabela(
      svg,
      o.porSerie ? legenda(dados.map((d, i) => ({ serie: d.serie || SERIES[i % 4], rotulo: d.rotulo }))) : '',
      [o.colRotulo || 'Item', o.colValor || 'Valor'],
      dados.map((d) => [d.rotulo, o.formatar ? o.formatar(d.valor) : d.valor])
    );
  };

  /* -------------------------------------------------------- colunas no tempo
     Série única sobre o tempo. Rótulo direto só no máximo e no último ponto. */
  WB.colunas = function (dados, opts) {
    const o = opts || {};
    const W = 320, H = 130, padB = 22, padT = 16;
    const max = Math.max(...dados.map((d) => d.valor), 1);
    const passo = W / dados.length;
    const larguraBarra = Math.min(30, passo - 10);
    const maiorIdx = dados.reduce((a, d, i) => (d.valor > dados[a].valor ? i : a), 0);

    const marcas = dados.map((d, i) => {
      const alt = (d.valor / max) * (H - padB - padT);
      const x = i * passo + (passo - larguraBarra) / 2;
      const y = H - padB - alt;
      const destacar = i === maiorIdx || i === dados.length - 1;
      return `<g>
        <title>${esc(d.rotulo)}: ${esc(o.formatar ? o.formatar(d.valor) : d.valor)}</title>
        <rect class="mark" x="${x}" y="${y}" width="${larguraBarra}" height="${alt}" rx="4" fill="var(--brand-slate)"/>
        ${destacar ? `<text class="chart__val" x="${x + larguraBarra / 2}" y="${y - 5}" text-anchor="middle">${esc(o.formatar ? o.formatar(d.valor) : d.valor)}</text>` : ''}
        <text x="${x + larguraBarra / 2}" y="${H - 6}" text-anchor="middle">${esc(d.rotulo)}</text>
      </g>`;
    }).join('');

    const svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(o.descricao || 'Gráfico de colunas')}" style="height:180px">
      <line class="axis" x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}"/>
      ${marcas}</svg>`;

    return WB.comTabela(svg, '', [o.colRotulo || 'Período', o.colValor || 'Valor'],
      dados.map((d) => [d.rotulo, o.formatar ? o.formatar(d.valor) : d.valor]));
  };

  /* -------------------------------------------------------------- empilhado
     Composição ao longo do tempo. Separador de 2px na cor da superfície.    */
  WB.empilhado = function (dados, series, opts) {
    const o = opts || {};
    const W = 340, H = 150, padB = 22, padT = 10;
    const totais = dados.map((d) => series.reduce((s, k) => s + (d[k.chave] || 0), 0));
    const max = Math.max(...totais, 1);
    const passo = W / dados.length;
    const bw = Math.min(34, passo - 12);

    const col = dados.map((d, i) => {
      const x = i * passo + (passo - bw) / 2;
      let acum = 0;
      const segs = series.map((s, si) => {
        const v = d[s.chave] || 0;
        const alt = (v / max) * (H - padB - padT);
        acum += alt;
        const y = H - padB - acum;
        return `<rect class="mark mark-sep" x="${x}" y="${y}" width="${bw}" height="${Math.max(alt, 0)}"
          fill="var(--${SERIES[si]})" stroke="var(--surface)" stroke-width="2"><title>${esc(s.rotulo)} · ${esc(d.rotulo)}: ${esc(o.formatar ? o.formatar(v) : v)}</title></rect>`;
      }).join('');
      return `<g>${segs}<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(d.rotulo)}</text></g>`;
    }).join('');

    const svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(o.descricao || 'Gráfico de colunas empilhadas')}" style="height:200px">
      <line class="axis" x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}"/>${col}</svg>`;

    return WB.comTabela(
      svg,
      legenda(series.map((s, i) => ({ serie: SERIES[i], rotulo: s.rotulo }))),
      [o.colRotulo || 'Período'].concat(series.map((s) => s.rotulo)),
      dados.map((d) => [d.rotulo].concat(series.map((s) => (o.formatar ? o.formatar(d[s.chave]) : d[s.chave]))))
    );
  };

  /* ------------------------------------------------------------------ funil
     Etapas em sequência: a ordem carrega informação, então a numeração vale. */
  WB.funil = function (etapas) {
    const max = Math.max(...etapas.map((e) => e.valor), 1);
    return `<div class="rows">${etapas.map((e, i) => {
      const pct = (e.valor / max) * 100;
      const conv = i === 0 ? '' : `${((e.valor / etapas[i - 1].valor) * 100).toFixed(1)}% da etapa anterior`;
      return `<div class="row" style="cursor:default">
        <span class="tmark">${i + 1}</span>
        <div class="row__main">
          <div class="row__title">${esc(e.etapa)}</div>
          <div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div>
          ${conv ? `<div class="row__meta">${esc(conv)}</div>` : ''}
        </div>
        <div class="row__side"><strong class="num">${WB.milhar(e.valor)}</strong></div>
      </div>`;
    }).join('')}</div>`;
  };
})();
