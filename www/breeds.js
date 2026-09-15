/* ====================================================================
 *  猫品种数据库（学名 / 中文 / 别名 / 简介）
 *  - 数据来源：本地整理（学名以国际爱猫联合会 CFA / TICA / FIFe 为准）
 *  - 搜索时：先本地匹配，失败可点击"在线搜索"调用 catfact.ninja 补充
 * ==================================================================== */
window.CAT_BREEDS = [
  /* ============ 英国短毛猫 British Shorthair ============ */
  { n: '英短金渐层',     sci: 'British Shorthair Golden Shaded',           aliases: ['金渐层','金吉拉','英短金'],          cat: '英短',  origin: '英国',       intro: '底层绒毛金黄，毛尖黑色，圆脸大眼，温顺亲人。' },
  { n: '英短银渐层',     sci: 'British Shorthair Silver Shaded',           aliases: ['银渐层','银吉拉','英短银'],          cat: '英短',  origin: '英国',       intro: '底层绒毛银白，毛尖黑色，眼睛多为绿色或蓝绿色。' },
  { n: '英短蓝猫',       sci: 'British Shorthair Blue',                    aliases: ['蓝猫','蓝胖子','英短蓝'],            cat: '英短',  origin: '英国',       intro: '纯蓝色被毛，铜色大眼，圆润矮胖，性格稳重。' },
  { n: '英短蓝白',       sci: 'British Shorthair Blue & White',            aliases: ['蓝白','英短蓝白双色'],                cat: '英短',  origin: '英国',       intro: '蓝白双色被毛，性格温顺亲人，是热门家养色系。' },
  { n: '英短乳白',       sci: 'British Shorthair Cream & White',           aliases: ['乳白','英短乳白'],                    cat: '英短',  origin: '英国',       intro: '奶油色与白色组合，毛色柔和，性格温和。' },
  { n: '英短纯白',       sci: 'British Shorthair White',                   aliases: ['纯白','英短白'],                      cat: '英短',  origin: '英国',       intro: '全身雪白被毛，眼睛多为蓝色或鸳鸯眼。' },
  { n: '英短纯黑',       sci: 'British Shorthair Black',                   aliases: ['纯黑','英短黑'],                      cat: '英短',  origin: '英国',       intro: '纯黑被毛，铜色或金色眼睛，毛色深邃。' },
  { n: '英短三花',       sci: 'British Shorthair Tortoiseshell & White',   aliases: ['三花','英短三花'],                    cat: '英短',  origin: '英国',       intro: '三色组合，通常为母猫，性格独立。' },
  { n: '英短玳瑁',       sci: 'British Shorthair Tortoiseshell',           aliases: ['玳瑁','英短玳瑁'],                    cat: '英短',  origin: '英国',       intro: '黄黑相间，色泽独特，多为母猫。' },
  { n: '英短重点色',     sci: 'British Shorthair Colourpoint',             aliases: ['重点色英短','英短点色'],              cat: '英短',  origin: '英国',       intro: '脸部耳朵尾部深色，类似暹罗重点色。' },

  /* ============ 美国短毛猫 American Shorthair ============ */
  { n: '美短银虎斑',     sci: 'American Shorthair Silver Tabby',          aliases: ['银虎斑','美短银虎斑','美短'],        cat: '美短',  origin: '美国',       intro: '经典银色虎斑，绿色或棕色眼睛，活泼健康。' },
  { n: '美短棕虎斑',     sci: 'American Shorthair Brown Tabby',           aliases: ['棕虎斑','美短棕虎斑'],                cat: '美短',  origin: '美国',       intro: '棕色虎斑纹路，传统美短代表色。' },
  { n: '美短橘虎斑',     sci: 'American Shorthair Red Tabby',              aliases: ['橘虎斑','美短橘'],                    cat: '美短',  origin: '美国',       intro: '橘色虎斑，活泼亲人，"十只橘猫九只胖"。' },
  { n: '美短蓝虎斑',     sci: 'American Shorthair Blue Tabby',             aliases: ['蓝虎斑','美短蓝'],                    cat: '美短',  origin: '美国',       intro: '蓝色虎斑，沉稳温顺。' },
  { n: '美短黑白',       sci: 'American Shorthair Black & White',          aliases: ['美短黑白','奶牛美短'],                cat: '美短',  origin: '美国',       intro: '黑白对比鲜明，类似奶牛花纹。' },

  /* ============ 布偶猫 Ragdoll ============ */
  { n: '海豹双色布偶',   sci: 'Ragdoll Seal Bicolour',              aliases: ['海豹双色','双色布偶','布偶'],          cat: '布偶',  origin: '美国',       intro: '面部倒V型白色，蓝色大眼，性格如布娃娃般温顺。' },
  { n: '蓝双色布偶',     sci: 'Ragdoll Blue Bicolour',              aliases: ['蓝双色','蓝双'],                       cat: '布偶',  origin: '美国',       intro: '蓝灰色重点色加白色双色，蓝色眼睛。' },
  { n: '巧克力双色布偶', sci: 'Ragdoll Chocolate Bicolour',         aliases: ['巧克力双色','巧双'],                   cat: '布偶',  origin: '美国',       intro: '巧克力色重点色，温暖甜美。' },
  { n: '海豹手套布偶',   sci: 'Ragdoll Seal Mitted',                aliases: ['海豹手套','手套布偶'],                 cat: '布偶',  origin: '美国',       intro: '四肢白色像戴手套，下巴白色。' },
  { n: '重点色布偶',     sci: 'Ragdoll Colourpoint',                aliases: ['重点色布偶'],                          cat: '布偶',  origin: '美国',       intro: '类似暹罗的重点色分布，蓝色大眼。' },

  /* ============ 暹罗猫 Siamese ============ */
  { n: '暹罗重点色',     sci: 'Siamese Seal Point',                 aliases: ['暹罗','暹罗猫','海豹色暹罗'],          cat: '暹罗',  origin: '泰国',       intro: '经典暹罗色，脸耳尾深棕色，蓝色杏仁眼。' },
  { n: '暹罗蓝色',       sci: 'Siamese Blue Point',                 aliases: ['蓝色暹罗'],                            cat: '暹罗',  origin: '泰国',       intro: '蓝灰色重点色，蓝色眼睛。' },
  { n: '暹罗巧克力',     sci: 'Siamese Chocolate Point',            aliases: ['巧克力暹罗'],                          cat: '暹罗',  origin: '泰国',       intro: '巧克力色重点色，性格活泼好动爱叫。' },
  { n: '暹罗丁香色',     sci: 'Siamese Lilac Point',                aliases: ['丁香暹罗','淡紫暹罗'],                 cat: '暹罗',  origin: '泰国',       intro: '淡紫色重点色，温柔甜美。' },

  /* ============ 波斯猫 Persian ============ */
  { n: '波斯纯白',       sci: 'Persian White',                      aliases: ['纯白波斯'],                            cat: '波斯',  origin: '波斯（今伊朗）', intro: '雪白长毛，鸳鸯眼或蓝色眼睛，高贵优雅。' },
  { n: '波斯金吉拉',     sci: 'Persian Chinchilla',                 aliases: ['金吉拉波斯','波斯金渐层'],             cat: '波斯',  origin: '波斯（今伊朗）', intro: '波斯金渐层，毛尖深色底层金色，绿眼。' },
  { n: '波斯重点色',     sci: 'Persian Himalayan',                  aliases: ['喜马拉雅','重点色波斯'],               cat: '波斯',  origin: '美国/波斯',  intro: '波斯与暹罗杂交色系，长毛重点色，蓝色大眼。' },
  { n: '波斯玳瑁',       sci: 'Persian Tortoiseshell',              aliases: ['玳瑁波斯'],                            cat: '波斯',  origin: '波斯（今伊朗）', intro: '黄黑相间长毛，扁平的脸。' },
  { n: '异国短毛猫',     sci: 'Exotic Shorthair',                   aliases: ['加菲猫','异短'],                        cat: '波斯',  origin: '美国',       intro: '波斯短毛版，扁脸大眼，毛短易打理。' },

  /* ============ 缅因猫 Maine Coon ============ */
  { n: '缅因银虎斑',     sci: 'Maine Coon Silver Tabby',            aliases: ['银虎斑缅因','缅因'],                   cat: '缅因',  origin: '美国',       intro: '大型长毛猫，体型巨大，温和友善。' },
  { n: '缅因棕虎斑',     sci: 'Maine Coon Brown Tabby',             aliases: ['棕虎斑缅因'],                          cat: '缅因',  origin: '美国',       intro: '传统缅因色，温顺亲人，被誉为"温柔的巨人"。' },
  { n: '缅因纯色',       sci: 'Maine Coon Solid Colour',            aliases: ['纯色缅因'],                            cat: '缅因',  origin: '美国',       intro: '纯色缅因猫，常见蓝、黑、白、红等。' },

  /* ============ 其他品种 ============ */
  { n: '斯芬克斯',       sci: 'Sphynx',                             aliases: ['无毛猫','加拿大无毛'],                 cat: '斯芬克斯', origin: '加拿大',  intro: '全身无毛，皮肤多皱，耳朵大，性格粘人。' },
  { n: '俄罗斯蓝猫',     sci: 'Russian Blue',                       aliases: ['俄蓝','俄罗斯蓝'],                     cat: '俄蓝',  origin: '俄罗斯',     intro: '蓝灰色短毛，绿眼睛，文静害羞。' },
  { n: '阿比西尼亚猫',   sci: 'Abyssinian',                         aliases: ['阿比'],                                cat: '阿比西尼亚', origin: '埃塞俄比亚', intro: '毛色似野兔，活泼聪明，运动能力强。' },
  { n: '孟加拉豹猫',     sci: 'Bengal',                             aliases: ['孟加拉','豹猫'],                       cat: '孟加拉', origin: '美国',       intro: '豹纹被毛，野性外观，活泼好动。' },
  { n: '苏格兰折耳',     sci: 'Scottish Fold',                      aliases: ['折耳','苏格兰折耳'],                   cat: '折耳',  origin: '苏格兰',     intro: '耳朵向前折叠，圆脸大眼，性格温顺。' },
  { n: '美国卷耳',       sci: 'American Curl',                      aliases: ['卷耳','美卷'],                         cat: '卷耳',  origin: '美国',       intro: '耳朵向后卷曲，活泼亲人。' },
  { n: '孟买猫',         sci: 'Bombay',                             aliases: ['孟买','小黑豹'],                       cat: '孟买',  origin: '美国',       intro: '全身漆黑，铜色大眼，像迷你黑豹。' },
  { n: '巴厘猫',         sci: 'Balinese',                           aliases: ['巴厘'],                                cat: '巴厘',  origin: '美国',       intro: '长毛暹罗，性格相似，外形优雅。' },
  { n: '土耳其安哥拉',   sci: 'Turkish Angora',                     aliases: ['安哥拉'],                              cat: '安哥拉', origin: '土耳其',     intro: '长毛猫祖先之一，优雅灵动。' },
  { n: '土耳其梵猫',     sci: 'Turkish Van',                        aliases: ['梵猫'],                                cat: '梵猫',  origin: '土耳其',     intro: '爱游泳的猫，被毛有防水特性。' },
  { n: '挪威森林猫',     sci: 'Norwegian Forest Cat',               aliases: ['挪威森林'],                            cat: '挪威森林', origin: '挪威',      intro: '大型长毛猫，皮毛防水，森林气质。' },
  { n: '东短',           sci: 'Oriental Shorthair',                 aliases: ['东方短毛猫'],                          cat: '东短',  origin: '英国/泰国',  intro: '暹罗的近亲，体型纤细，大耳朵。' },
  { n: '伯曼猫',         sci: 'Birman',                             aliases: ['伯曼'],                                cat: '伯曼',  origin: '缅甸',       intro: '重点色长毛，四爪白色手套，蓝色眼。' },

  /* ============ 中华田园猫（按花色） ============ */
  { n: '橘猫',           sci: 'Chinese Garden Cat (Orange)',        aliases: ['大橘','黄猫','田园橘'],                cat: '中华田园', origin: '中国',    intro: '常见家猫花色，体型偏胖，亲人贪吃。' },
  { n: '狸花猫',         sci: 'Chinese Li Hua',                     aliases: ['狸猫','虎斑猫','田园狸花'],            cat: '中华田园', origin: '中国',    intro: '虎斑纹路，体格健壮，捕鼠能力强。' },
  { n: '三花猫',         sci: 'Chinese Calico',                     aliases: ['三花','田园三花'],                     cat: '中华田园', origin: '中国',    intro: '三种颜色组合，多为母猫，性格独立。' },
  { n: '奶牛猫',         sci: 'Chinese Tuxedo',                     aliases: ['奶牛','黑白猫'],                       cat: '中华田园', origin: '中国',    intro: '黑白配色，像穿着燕尾服，外号"猫中哈士奇"。' },
  { n: '玳瑁猫',         sci: 'Chinese Tortoiseshell',              aliases: ['玳瑁','田园玳瑁'],                     cat: '中华田园', origin: '中国',    intro: '黄黑混合毛色，多为母猫，性格温顺。' },
  { n: '白猫',           sci: 'Chinese Solid White',                aliases: ['纯白田园'],                            cat: '中华田园', origin: '中国',    intro: '纯白被毛，部分可能鸳鸯眼或耳聋。' },
  { n: '黑猫',           sci: 'Chinese Solid Black',                aliases: ['纯黑田园','玄猫'],                     cat: '中华田园', origin: '中国',    intro: '纯黑被毛，古称"玄猫"，被视为辟邪。' },
  { n: '山东狮子猫',     sci: 'Shandong Lion Cat',                  aliases: ['狮子猫','临清狮猫'],                   cat: '中华田园', origin: '中国山东',intro: '长毛白猫，颈毛如狮，部分鸳鸯眼。' },
  { n: '黄狸',           sci: 'Chinese Yellow Tabby',               aliases: ['黄狸花'],                              cat: '中华田园', origin: '中国',    intro: '黄色虎斑田园猫，常见本土花色。' },
  { n: '四川简州猫',     sci: 'Sichuan Jianzhou Cat',               aliases: ['简州猫','四耳猫'],                     cat: '中华田园', origin: '中国四川',intro: '古代四大名猫之一，耳朵轮廓独特。' },

  /* ============ 其他常见花色 ============ */
  { n: '金吉拉',         sci: 'Chinchilla',                         aliases: ['波斯金吉拉'],                          cat: '波斯',  origin: '波斯（今伊朗）', intro: '金渐层或银渐层波斯，绿色大眼。' },
  { n: '千层被毛猫',     sci: 'Chinchilla Persian',                 aliases: ['金吉拉波斯'],                          cat: '波斯',  origin: '波斯（今伊朗）', intro: '金渐层或银渐层波斯长毛版本。' },

  /* ============ 补充小众品种 ============ */
  { n: '新加坡猫',       sci: 'Singapura',                          aliases: ['狮城猫'],                              cat: '新加坡猫', origin: '新加坡', intro: '世界上最小的猫种之一，体型小巧。' },
  { n: '柯尼斯卷毛',     sci: 'Cornish Rex',                        aliases: ['柯尼斯'],                              cat: '柯尼斯', origin: '英国',     intro: '被毛卷曲，胡须也卷，体型纤细。' },
  { n: '德文卷毛',       sci: 'Devon Rex',                          aliases: ['德文'],                                cat: '德文',  origin: '英国',     intro: '精灵般大耳朵，卷毛，活泼亲人。' },
  { n: '萨凡纳猫',       sci: 'Savannah',                           aliases: ['萨凡纳'],                              cat: '萨凡纳', origin: '美国',     intro: '薮猫杂交，体型修长，野性外观。' },
  { n: '哈瓦那棕猫',     sci: 'Havana Brown',                       aliases: ['哈瓦那'],                              cat: '哈瓦那', origin: '英国',     intro: '巧克力棕色短毛，绿色眼睛。' },
  { n: '玩具虎猫',       sci: 'Toyger',                             aliases: ['玩具虎'],                              cat: '玩具虎', origin: '美国',     intro: '模仿老虎条纹的家养品种。' },
];

/* 搜索算法：模糊匹配 + 编辑距离
 * 评分体系（借鉴 Codex）：
 *   100 = 完全匹配
 *    80+len = 包含
 *    55+len = 反向包含
 *    30 = 编辑距离 ≤ 2
 * 拆字匹配和学名首字母作为额外加分
 */
function normalizeStr(s) {
  return (s || '').toLowerCase()
    .replace(/[\s·\-_()（）]/g, '');
}

function editDistance(a, b) {
  if (a.length > 24 || b.length > 24) return 99;
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const table = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) table[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    table[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = table[j];
      table[j] = a[i - 1] === b[j - 1]
        ? prev
        : Math.min(table[j] + 1, table[j - 1] + 1, prev + 1);
      prev = tmp;
    }
  }
  return table[b.length];
}

function fuzzyScore(item, q) {
  if (!q) return 1;
  const nq = normalizeStr(q.trim());
  if (!nq) return 1;
  const fields = [item.n, item.sci, item.cat, item.origin, ...(item.aliases || [])]
    .map(normalizeStr);
  let best = 0;
  for (const f of fields) {
    if (!f) continue;
    if (f === nq) best = Math.max(best, 100);
    else if (f.includes(nq)) best = Math.max(best, 80 + nq.length);
    else if (nq.includes(f)) best = Math.max(best, 55 + f.length);
    else if (Math.abs(f.length - nq.length) <= 2 && editDistance(f, nq) <= 2) {
      best = Math.max(best, 30);
    }
  }
  if (best === 0) {
    // 拆字匹配（中文场景）
    const qChars = [...q.trim()];
    const allJoined = fields.join('');
    if (qChars.length > 1 && qChars.every(c => allJoined.includes(c))) best = 25;
    // 学名首字母（如 "bs" → "British Shorthair"）
    const sciInitials = (item.sci || '').split(/\s+/).map(w => w[0] || '').join('').toLowerCase();
    if (sciInitials.startsWith(nq) && nq.length >= 2) best = Math.max(best, 20);
  }
  return best;
}

window.searchBreeds = function (query, limit = 12) {
  const list = window.CAT_BREEDS;
  if (!query || !query.trim()) return list.slice(0, limit);
  return list.map(it => ({ it, s: fuzzyScore(it, query) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.it);
};

/* 在线搜索：调用中文维基百科 API，更适合中文品种名
 * 用户输入"金渐层" → "英短金渐层"也能搜到
 * 失败时回退到 catfact.ninja
 */
window.searchBreedsOnline = async function (query, limit = 8) {
  if (!query || !query.trim() || query.trim().length < 2) {
    return { error: '请至少输入两个字再联网搜索' };
  }
  // 1. 优先：中文维基百科
  try {
    const encoded = encodeURIComponent(query.trim() + ' 猫');
    const url = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&origin=*&srlimit=${limit}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'CatGrowth/2.0 (breed lookup)' },
    });
    if (r.ok) {
      const data = await r.json();
      const found = data?.query?.search || [];
      const results = [];
      const seen = new Set();
      for (const item of found) {
        const title = (item.title || '').trim();
        if (title && !seen.has(title)) {
          seen.add(title);
          results.push({
            n: title,
            sci: title,
            cat: '维基百科',
            origin: '在线结果',
            intro: (item.snippet || '').replace(/<[^>]+>/g, '').slice(0, 60),
            online: true,
          });
        }
      }
      if (results.length) return results;
    }
  } catch (e) { /* 维基失败回退 */ }
  // 2. 回退：catfact.ninja（英文品种）
  try {
    const r = await fetch('https://catfact.ninja/breeds?limit=100');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const all = data.data || [];
    const q = query.trim().toLowerCase();
    return all
      .filter(b => b.breed.toLowerCase().includes(q) || (b.origin || '').toLowerCase().includes(q))
      .slice(0, limit)
      .map(b => ({
        n: b.breed,
        sci: b.breed,
        cat: '英文品种',
        origin: b.origin || '',
        intro: (b.coat || '') + (b.pattern ? ' / ' + b.pattern : ''),
        online: true,
      }));
  } catch (e) {
    return { error: e.message };
  }
};