import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  RAKUTEN_APP_ID: string
  RAKUTEN_ACCESS_KEY: string
  RAKUTEN_AFFILIATE_ID: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// 商品データの型定義
interface Product {
  name: string
  price: number
  url: string
  imageUrl: string
  reviewCount: number
  rating: number
  category: string
}

// 楽天市場APIレスポンスの型定義 (旧バージョン)
interface RakutenItem {
  Item: {
    itemName: string
    itemPrice: number
    itemUrl: string
    mediumImageUrls?: Array<{ imageUrl: string }>
    reviewCount: number
    reviewAverage: number
    genreId: string
    shopName: string
    affiliateUrl?: string
  }
}

// 紹介文生成用のフック例
const hooks = [
  "え、これだけで解決？",
  "知らないと損する！",
  "みんなが黙って買ってる",
  "SNSで話題沸騰中",
  "プロも愛用してる",
  "コスパ最強説",
  "これは革命的",
  "もう手放せない",
  "ズボラさんの救世主",
  "買わない理由が見つからない",
  "バズってる理由がわかった",
  "リピーター続出の秘密",
  "早い者勝ちかも",
  "今すぐチェック必須",
  "これ使わないの損してる"
]

const emojis = ["✨", "💡", "🎯", "👏", "🔥", "💪", "🌟", "❤️", "😊", "🎉", "⭐", "👍", "💖", "🙌", "😍"]

// カテゴリ別の検索キーワード
const categoryKeywords: Record<string, string[]> = {
  cleaning: [
    "掃除用具", "クリーナー", "モップ", "ほうき", "雑巾", "洗剤", 
    "メラミンスポンジ", "掃除機", "フローリング", "お風呂掃除"
  ],
  outdoor: [
    "キャンプ", "アウトドア", "テント", "チェア", "テーブル", 
    "BBQ", "バーベキュー", "寝袋", "ランタン", "クーラーボックス"
  ],
  diy: [
    "工具", "DIY", "電動ドライバー", "のこぎり", "ハンマー",
    "棚", "収納", "組み立て", "ドリル", "ネジ"
  ],
  car: [
    "カー用品", "車載", "ドライブレコーダー", "カーナビ", "シートカバー",
    "掃除機", "カーアクセサリー", "芳香剤", "タイヤ", "洗車"
  ]
}

// 紹介文生成関数
function generateDescription(product: Product): string {
  const hook = hooks[Math.floor(Math.random() * hooks.length)]
  const selectedEmojis = [...Array(3)].map(() => 
    emojis[Math.floor(Math.random() * emojis.length)]
  )
  
  const reasons = [
    `口コミ${product.reviewCount}件超えの人気商品`,
    `評価${product.rating}の高評価`,
    `この価格帯では考えられないコスパ`,
    `リピーター続出の実力派`,
    `SNSで話題の注目アイテム`,
    `楽天ランキング上位の実績`,
    `購入者満足度が高い`
  ]
  
  const reason = reasons[Math.floor(Math.random() * reasons.length)]
  
  const templates = [
    `${hook}${selectedEmojis[0]} ${product.name}が今めちゃくちゃ売れてます。${reason}で、実際に使った人からは「もっと早く買えばよかった」の声が続出。${product.category}選びで迷ってる方は、この評判を見逃さないで${selectedEmojis[1]} 価格も${product.price.toLocaleString()}円とお手頃で、コスパ最強との声多数${selectedEmojis[2]}`,
    
    `${hook}${selectedEmojis[0]} 楽天で${product.reviewCount}件以上のレビューを集める${product.name}。人気の理由は、${reason}という点。「買ってよかった」「リピ決定」という口コミが目立ちます${selectedEmojis[1]} ${product.price.toLocaleString()}円でこのクオリティは正直お得すぎる${selectedEmojis[2]}`,
    
    `${hook}${selectedEmojis[0]} ${product.category}で今一番注目されてる${product.name}。${reason}で、購入者の満足度がすごく高いんです。「期待以上だった」「コスパ良すぎ」って評判ばかり${selectedEmojis[1]} ${product.price.toLocaleString()}円でこの性能なら納得の人気ぶり${selectedEmojis[2]}`
  ]
  
  return templates[Math.floor(Math.random() * templates.length)]
}

// 楽天市場API検索関数
async function searchRakutenProducts(
  keyword: string, 
  appId: string,
  accessKey: string,
  affiliateId: string,
  maxItems: number = 10
): Promise<Product[]> {
  try {
    const params = new URLSearchParams({
      applicationId: appId,
      keyword: keyword,
      hits: maxItems.toString(),
      minPrice: '1000',
      maxPrice: '10000',
      sort: '-reviewCount', // レビュー数順
      affiliateId: affiliateId
    })

    const response = await fetch(
      `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(`楽天API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.Items || data.Items.length === 0) {
      return []
    }

    return data.Items.slice(0, maxItems).map((item: RakutenItem) => ({
      name: item.Item.itemName,
      price: item.Item.itemPrice,
      url: item.Item.affiliateUrl || item.Item.itemUrl,
      imageUrl: item.Item.mediumImageUrls?.[0]?.imageUrl || '/static/placeholder.jpg',
      reviewCount: item.Item.reviewCount || 0,
      rating: item.Item.reviewAverage || 0,
      category: getCategoryName(item.Item.genreId)
    }))
  } catch (error) {
    console.error('楽天API検索エラー:', error)
    return []
  }
}

// カテゴリ名取得
function getCategoryName(genreId: string): string {
  // ジャンルIDからカテゴリ名を推測（簡易版）
  return 'おすすめ商品'
}

// カテゴリ名マッピング
const categoryNames: Record<string, string> = {
  cleaning: '掃除グッズ',
  outdoor: 'アウトドア',
  diy: 'DIYグッズ',
  car: '自動車関連'
}

// API: カテゴリ別商品取得（楽天API使用）
app.get('/api/products/:category', async (c) => {
  const category = c.req.param('category')
  const { RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY, RAKUTEN_AFFILIATE_ID } = c.env
  
  if (!RAKUTEN_APP_ID || !RAKUTEN_ACCESS_KEY || !RAKUTEN_AFFILIATE_ID) {
    return c.json({ error: 'API設定が不足しています' }, 500)
  }

  const keywords = categoryKeywords[category]
  if (!keywords) {
    return c.json({ error: 'カテゴリが見つかりません' }, 404)
  }

  // ランダムにキーワードを選択
  const keyword = keywords[Math.floor(Math.random() * keywords.length)]
  
  const products = await searchRakutenProducts(
    keyword,
    RAKUTEN_APP_ID,
    RAKUTEN_ACCESS_KEY,
    RAKUTEN_AFFILIATE_ID,
    10
  )

  // カテゴリ名を設定
  const categoryName = categoryNames[category] || 'おすすめ商品'
  const productsWithCategory = products.map(p => ({
    ...p,
    category: categoryName
  }))

  const productsWithDescriptions = productsWithCategory.map(product => ({
    ...product,
    description: generateDescription(product),
    reason: `${product.reviewCount}件以上のレビューで評価${product.rating}を獲得。口コミで広がる実力派商品です。`
  }))
  
  return c.json(productsWithDescriptions)
})

// API: ランダムに10商品取得（楽天API使用）
app.get('/api/products/random/10', async (c) => {
  const { RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY, RAKUTEN_AFFILIATE_ID } = c.env
  
  if (!RAKUTEN_APP_ID || !RAKUTEN_ACCESS_KEY || !RAKUTEN_AFFILIATE_ID) {
    return c.json({ error: 'API設定が不足しています' }, 500)
  }

  // 全カテゴリからランダムに選択
  const allKeywords = Object.values(categoryKeywords).flat()
  const selectedKeywords = [...allKeywords]
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
  
  const allProducts: Product[] = []
  
  for (const keyword of selectedKeywords) {
    const products = await searchRakutenProducts(
      keyword,
      RAKUTEN_APP_ID,
      RAKUTEN_ACCESS_KEY,
      RAKUTEN_AFFILIATE_ID,
      4
    )
    allProducts.push(...products)
  }

  // ランダムに10商品選択
  const selectedProducts = allProducts
    .sort(() => 0.5 - Math.random())
    .slice(0, 10)

  const productsWithDescriptions = selectedProducts.map(product => ({
    ...product,
    description: generateDescription(product),
    reason: `${product.reviewCount}件以上のレビューで評価${product.rating}を獲得。楽天市場で人気急上昇中の注目商品です。`
  }))
  
  return c.json(productsWithDescriptions)
})

// メインページ（HTMLは変更なし）
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>楽天ROOM売れ筋リサーチャー</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .product-card {
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }
          .copy-btn {
            transition: all 0.3s;
          }
          .copy-btn:active {
            transform: scale(0.95);
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
    </head>
    <body class="bg-gradient-to-br from-pink-50 to-purple-50 min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-7xl">
            <!-- ヘッダー -->
            <div class="text-center mb-12">
                <h1 class="text-4xl md:text-5xl font-bold text-purple-800 mb-4">
                    <i class="fas fa-search-dollar mr-3"></i>
                    楽天ROOM売れ筋リサーチャー
                </h1>
                <p class="text-gray-600 text-lg">
                    今日売れてる商品を見つけて、魅力的な紹介文で収益アップ！✨
                </p>
                <div class="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg inline-block">
                    <i class="fas fa-check-circle mr-2"></i>
                    楽天市場APIと連携済み - リアルタイムで売れ筋商品を取得中！
                </div>
            </div>

            <!-- カテゴリ選択 -->
            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-th-large mr-2"></i>
                    カテゴリを選択
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <button onclick="searchProducts('cleaning')" 
                            class="category-btn bg-gradient-to-r from-blue-400 to-blue-600 text-white p-6 rounded-xl hover:shadow-lg transition">
                        <i class="fas fa-broom text-3xl mb-2"></i>
                        <div class="font-bold">掃除グッズ</div>
                    </button>
                    <button onclick="searchProducts('outdoor')" 
                            class="category-btn bg-gradient-to-r from-green-400 to-green-600 text-white p-6 rounded-xl hover:shadow-lg transition">
                        <i class="fas fa-campground text-3xl mb-2"></i>
                        <div class="font-bold">アウトドア</div>
                    </button>
                    <button onclick="searchProducts('diy')" 
                            class="category-btn bg-gradient-to-r from-orange-400 to-orange-600 text-white p-6 rounded-xl hover:shadow-lg transition">
                        <i class="fas fa-tools text-3xl mb-2"></i>
                        <div class="font-bold">DIYグッズ</div>
                    </button>
                    <button onclick="searchProducts('car')" 
                            class="category-btn bg-gradient-to-r from-red-400 to-red-600 text-white p-6 rounded-xl hover:shadow-lg transition">
                        <i class="fas fa-car text-3xl mb-2"></i>
                        <div class="font-bold">自動車関連</div>
                    </button>
                    <button onclick="searchProducts('random')" 
                            class="category-btn bg-gradient-to-r from-purple-400 to-purple-600 text-white p-6 rounded-xl hover:shadow-lg transition">
                        <i class="fas fa-random text-3xl mb-2"></i>
                        <div class="font-bold">おまかせ10選</div>
                    </button>
                </div>
            </div>

            <!-- 結果表示エリア -->
            <div id="results" class="hidden">
                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-fire mr-2 text-red-500"></i>
                            売れ筋商品リスト
                        </h2>
                        <button onclick="copyAllDescriptions()" 
                                class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition">
                            <i class="fas fa-copy mr-2"></i>
                            全て一括コピー
                        </button>
                    </div>
                    <div id="productList" class="space-y-6"></div>
                </div>
            </div>

            <!-- ローディング -->
            <div id="loading" class="hidden text-center py-12">
                <div class="loading mx-auto mb-4"></div>
                <p class="text-gray-600">楽天市場から売れ筋商品をリサーチ中...</p>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            let currentProducts = [];

            async function searchProducts(category) {
                const loading = document.getElementById('loading');
                const results = document.getElementById('results');
                const productList = document.getElementById('productList');

                loading.classList.remove('hidden');
                results.classList.add('hidden');
                productList.innerHTML = '';

                try {
                    const endpoint = category === 'random' 
                        ? '/api/products/random/10' 
                        : \`/api/products/\${category}\`;
                    
                    const response = await axios.get(endpoint);
                    currentProducts = response.data;

                    loading.classList.add('hidden');
                    results.classList.remove('hidden');

                    if (currentProducts.length === 0) {
                        productList.innerHTML = '<p class="text-gray-500 text-center py-8">商品が見つかりませんでした</p>';
                        return;
                    }

                    currentProducts.forEach((product, index) => {
                        const productCard = createProductCard(product, index);
                        productList.innerHTML += productCard;
                    });
                } catch (error) {
                    loading.classList.add('hidden');
                    alert('エラーが発生しました: ' + error.message);
                }
            }

            function createProductCard(product, index) {
                return \`
                    <div class="product-card border border-gray-200 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex-1">
                                <div class="flex items-center mb-2">
                                    <span class="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold mr-2">
                                        #\${index + 1}
                                    </span>
                                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                        \${product.category}
                                    </span>
                                </div>
                                <h3 class="text-xl font-bold text-gray-800 mb-2">
                                    \${product.name}
                                </h3>
                                <div class="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                    <span class="font-bold text-2xl text-red-600">
                                        ¥\${product.price.toLocaleString()}
                                    </span>
                                    <span>
                                        <i class="fas fa-star text-yellow-500"></i>
                                        \${product.rating}
                                    </span>
                                    <span>
                                        <i class="fas fa-comment text-gray-400"></i>
                                        \${product.reviewCount}件
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <p class="text-sm font-bold text-yellow-800 mb-1">
                                <i class="fas fa-lightbulb mr-1"></i>
                                なぜ売れているか
                            </p>
                            <p class="text-sm text-gray-700">\${product.reason}</p>
                        </div>

                        <div class="bg-purple-50 border-l-4 border-purple-400 p-4 mb-4">
                            <div class="flex justify-between items-center mb-2">
                                <p class="text-sm font-bold text-purple-800">
                                    <i class="fas fa-pen-fancy mr-1"></i>
                                    楽天ROOM用紹介文
                                </p>
                                <span class="text-xs text-gray-500">
                                    \${product.description.length}文字
                                </span>
                            </div>
                            <p class="text-sm text-gray-700 leading-relaxed mb-3" id="description-\${index}">
                                \${product.description}
                            </p>
                            <button onclick="copyDescription(\${index})" 
                                    class="copy-btn w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">
                                <i class="fas fa-copy mr-2"></i>
                                この紹介文をコピー
                            </button>
                        </div>

                        <a href="\${product.url}" target="_blank" 
                           class="block w-full bg-red-600 text-white text-center py-3 rounded-lg hover:bg-red-700 transition">
                            <i class="fas fa-external-link-alt mr-2"></i>
                            楽天市場で見る
                        </a>
                    </div>
                \`;
            }

            function copyDescription(index) {
                const description = currentProducts[index].description;
                navigator.clipboard.writeText(description).then(() => {
                    alert('✅ 紹介文をコピーしました！');
                }).catch(err => {
                    alert('コピーに失敗しました: ' + err);
                });
            }

            function copyAllDescriptions() {
                const allDescriptions = currentProducts
                    .map((p, i) => \`[\${i + 1}] \${p.name}\\n\${p.description}\\n\${p.url}\\n\`)
                    .join('\\n---\\n\\n');
                
                navigator.clipboard.writeText(allDescriptions).then(() => {
                    alert('✅ 全ての紹介文をコピーしました！');
                }).catch(err => {
                    alert('コピーに失敗しました: ' + err);
                });
            }
        </script>
    </body>
    </html>
  `)
})

export default app
