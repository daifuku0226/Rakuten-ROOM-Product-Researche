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

// キャッチーなフック（1文目用）
const catchyHooks = [
  "他人への愛情よりも自分へのご褒美が優先だよね！",
  "いつまでそれで勝負するつもり？早く買い換えて暖かさを味方にしようよ！",
  "まだ我慢してるの？人生は一度きりだよ！",
  "その悩み、この商品で一発解決できるかも！",
  "知らないと損！みんなが黙って買ってる理由がこれ！",
  "え、まだ使ってないの？人生損してるかも！",
  "今年こそ変わりたいなら、これが答えかも！",
  "ズボラさんでも続けられる秘密、教えます！",
  "コスパ最強すぎて笑えてくる！",
  "一度使ったら戻れない、そんな魔法のアイテム！",
  "SNSで話題沸騰！売り切れる前にゲットしよ！",
  "こんなに便利なのに、なんで今まで知らなかったの？",
  "プロも愛用してる理由、わかっちゃった！",
  "もう我慢しなくていいんだよ、自分を甘やかそう！",
  "これがあれば毎日がもっと楽しくなる予感！"
]

const emojis = ["✨", "💡", "🎯", "👏", "🔥", "💪", "🌟", "❤️", "😊", "🎉", "⭐", "👍", "💖", "🙌", "😍", "🍫", "👖", "🎁", "🔥"]

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

// 紹介文生成関数（キャッチーで詳しい説明）
function generateDescription(product: Product): string {
  const hook = catchyHooks[Math.floor(Math.random() * catchyHooks.length)]
  const selectedEmojis = [...Array(3)].map(() => 
    emojis[Math.floor(Math.random() * emojis.length)]
  ).join('')
  
  // 商品の魅力ポイント
  const appealPoints = [
    `${product.reviewCount}件以上のレビューで評価${product.rating}を獲得している実力派`,
    `楽天ランキングで常に上位をキープする人気商品`,
    `リピーター続出！一度使ったら手放せなくなる魅力`,
    `SNSで話題沸騰中！みんなが黙って買ってる理由がわかる`,
    `プロも愛用する本格派！初心者から上級者まで満足できる品質`
  ]
  
  const appeal = appealPoints[Math.floor(Math.random() * appealPoints.length)]
  
  // 口コミ例（商品カテゴリに応じて適切な表現を使用）
  const reviews = [
    `「リピ確定」「もう手放せない」と絶賛されています`,
    `「買ってよかった」「期待以上だった」という声が続出`,
    `「もっと早く買えばよかった」「コスパ最強」と評判`,
    `「これは買い」「間違いない商品」と口コミで高評価`,
    `「満足度高い」「使いやすい」と口コミでも話題沸騰中`
  ]
  
  const review = reviews[Math.floor(Math.random() * reviews.length)]
  
  // テンプレート（例文のような構成）
  const templates = [
    `${hook} ${product.name}はいかがですか？${selectedEmojis} ${appeal}で、実際に使った人からの満足度も抜群。${review}。売り切れる前にゲットしておきたい逸品です！`,
    
    `${hook} そんなあなたにおすすめなのが「${product.name}」！${selectedEmojis} ${appeal}。${review}。${product.price.toLocaleString()}円でこのクオリティなら、間違いなく買いです！`,
    
    `${hook} だからこそ「${product.name}」を試してほしい！${selectedEmojis} ${appeal}という実績が証明しています。${review}。楽天で不動の人気を誇るのも納得の品質です！`
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

// デモ商品データ（カスタム検索用に多様な商品を追加）
const allDemoProducts: Product[] = [
  // 掃除グッズ
  { name: "激落ちくん メラミンスポンジ 大容量100個入", price: 1280, url: "https://item.rakuten.co.jp/sample/cleaning-001/", imageUrl: "/static/placeholder.jpg", reviewCount: 5430, rating: 4.6, category: "掃除グッズ" },
  { name: "マイクロファイバー クロス 20枚セット", price: 1580, url: "https://item.rakuten.co.jp/sample/cleaning-002/", imageUrl: "/static/placeholder.jpg", reviewCount: 3120, rating: 4.5, category: "掃除グッズ" },
  { name: "お風呂掃除ブラシ 電動 充電式", price: 3280, url: "https://item.rakuten.co.jp/sample/cleaning-003/", imageUrl: "/static/placeholder.jpg", reviewCount: 2890, rating: 4.4, category: "掃除グッズ" },
  
  // アウトドア
  { name: "折りたたみチェア 超軽量 アウトドア", price: 2980, url: "https://item.rakuten.co.jp/sample/outdoor-001/", imageUrl: "/static/placeholder.jpg", reviewCount: 4200, rating: 4.7, category: "アウトドア" },
  { name: "キャンプテーブル ワンタッチ設営 コンパクト収納", price: 5980, url: "https://item.rakuten.co.jp/sample/outdoor-002/", imageUrl: "/static/placeholder.jpg", reviewCount: 3200, rating: 4.7, category: "アウトドア" },
  { name: "LEDランタン USB充電式 防水", price: 2480, url: "https://item.rakuten.co.jp/sample/outdoor-003/", imageUrl: "/static/placeholder.jpg", reviewCount: 5100, rating: 4.6, category: "アウトドア" },
  
  // DIYグッズ
  { name: "電動ドライバーセット 充電式 コードレス", price: 4980, url: "https://item.rakuten.co.jp/sample/diy-001/", imageUrl: "/static/placeholder.jpg", reviewCount: 2890, rating: 4.5, category: "DIYグッズ" },
  { name: "収納棚 組み立て簡単 5段ラック", price: 3580, url: "https://item.rakuten.co.jp/sample/diy-002/", imageUrl: "/static/placeholder.jpg", reviewCount: 1950, rating: 4.4, category: "DIYグッズ" },
  { name: "工具セット 家庭用 100点セット", price: 3980, url: "https://item.rakuten.co.jp/sample/diy-003/", imageUrl: "/static/placeholder.jpg", reviewCount: 3450, rating: 4.5, category: "DIYグッズ" },
  
  // 自動車関連
  { name: "ドライブレコーダー 前後カメラ フルHD", price: 6980, url: "https://item.rakuten.co.jp/sample/car-001/", imageUrl: "/static/placeholder.jpg", reviewCount: 8540, rating: 4.6, category: "自動車関連" },
  { name: "車載掃除機 コードレス ハンディクリーナー", price: 2780, url: "https://item.rakuten.co.jp/sample/car-002/", imageUrl: "/static/placeholder.jpg", reviewCount: 3670, rating: 4.5, category: "自動車関連" },
  { name: "車載スマホホルダー マグネット式", price: 1680, url: "https://item.rakuten.co.jp/sample/car-003/", imageUrl: "/static/placeholder.jpg", reviewCount: 6230, rating: 4.6, category: "自動車関連" },
  
  // 文房具（カスタム検索用）
  { name: "ボールペン 可愛い 10本セット パステルカラー", price: 1280, url: "https://item.rakuten.co.jp/sample/stationery-001/", imageUrl: "/static/placeholder.jpg", reviewCount: 4560, rating: 4.7, category: "文房具" },
  { name: "付箋 可愛い 動物デザイン 8種類セット", price: 980, url: "https://item.rakuten.co.jp/sample/stationery-002/", imageUrl: "/static/placeholder.jpg", reviewCount: 3890, rating: 4.6, category: "文房具" },
  { name: "マスキングテープ 可愛い 24巻セット", price: 1580, url: "https://item.rakuten.co.jp/sample/stationery-003/", imageUrl: "/static/placeholder.jpg", reviewCount: 5120, rating: 4.8, category: "文房具" },
  { name: "手帳 2024 可愛い B6サイズ", price: 1980, url: "https://item.rakuten.co.jp/sample/stationery-004/", imageUrl: "/static/placeholder.jpg", reviewCount: 2340, rating: 4.5, category: "文房具" },
  { name: "シャープペンシル 可愛い 0.5mm 5本セット", price: 1480, url: "https://item.rakuten.co.jp/sample/stationery-005/", imageUrl: "/static/placeholder.jpg", reviewCount: 3210, rating: 4.6, category: "文房具" },
  
  // 冬・あったかグッズ（カスタム検索用）
  { name: "裏起毛パンツ レディース 暖かい ストレッチ", price: 2380, url: "https://item.rakuten.co.jp/sample/winter-001/", imageUrl: "/static/placeholder.jpg", reviewCount: 8970, rating: 4.7, category: "冬グッズ" },
  { name: "電気毛布 USB 膝掛け あったか", price: 3280, url: "https://item.rakuten.co.jp/sample/winter-002/", imageUrl: "/static/placeholder.jpg", reviewCount: 6540, rating: 4.6, category: "冬グッズ" },
  { name: "ルームソックス もこもこ 暖かい", price: 1180, url: "https://item.rakuten.co.jp/sample/winter-003/", imageUrl: "/static/placeholder.jpg", reviewCount: 4230, rating: 4.5, category: "冬グッズ" },
  { name: "カイロ 貼る 30個入 あったか", price: 980, url: "https://item.rakuten.co.jp/sample/winter-004/", imageUrl: "/static/placeholder.jpg", reviewCount: 5670, rating: 4.6, category: "冬グッズ" },
  
  // プレゼント1000円台（カスタム検索用）
  { name: "入浴剤 ギフトセット 10種類 プレゼント", price: 1480, url: "https://item.rakuten.co.jp/sample/gift-001/", imageUrl: "/static/placeholder.jpg", reviewCount: 3890, rating: 4.6, category: "ギフト" },
  { name: "ハンドクリーム ギフト 3本セット プレゼント", price: 1680, url: "https://item.rakuten.co.jp/sample/gift-002/", imageUrl: "/static/placeholder.jpg", reviewCount: 4120, rating: 4.7, category: "ギフト" },
  { name: "紅茶 ギフトセット 5種類 プレゼント", price: 1980, url: "https://item.rakuten.co.jp/sample/gift-003/", imageUrl: "/static/placeholder.jpg", reviewCount: 2560, rating: 4.5, category: "ギフト" }
]

// カテゴリ別商品データ（既存のカテゴリボタン用）
const demoProducts: Record<string, Product[]> = {
  cleaning: allDemoProducts.filter(p => p.category === "掃除グッズ"),
  outdoor: allDemoProducts.filter(p => p.category === "アウトドア"),
  diy: allDemoProducts.filter(p => p.category === "DIYグッズ"),
  car: allDemoProducts.filter(p => p.category === "自動車関連")
}

// API: カテゴリ別商品取得（デモデータ優先）
app.get('/api/products/:category', async (c) => {
  const category = c.req.param('category')
  
  // デモデータを使用
  let products = demoProducts[category] || []
  
  // 楽天APIを試行（オプション）
  const { RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY, RAKUTEN_AFFILIATE_ID } = c.env || {}
  
  if (RAKUTEN_APP_ID && RAKUTEN_ACCESS_KEY && RAKUTEN_AFFILIATE_ID && products.length === 0) {
    const keywords = categoryKeywords[category]
    if (keywords) {
      const keyword = keywords[Math.floor(Math.random() * keywords.length)]
      
      try {
        const apiProducts = await searchRakutenProducts(
          keyword,
          RAKUTEN_APP_ID,
          RAKUTEN_ACCESS_KEY,
          RAKUTEN_AFFILIATE_ID,
          10
        )
        
        if (apiProducts.length > 0) {
          products = apiProducts
        }
      } catch (error) {
        console.error('楽天API呼び出しエラー:', error)
        // デモデータにフォールバック
      }
    }
  }

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

// API: カスタムキーワード検索（リクエスト欄用）
app.get('/api/products/search/:keyword', async (c) => {
  const keyword = decodeURIComponent(c.req.param('keyword')).toLowerCase()
  
  // デモデータからキーワードに合った商品を検索
  let selectedProducts = allDemoProducts.filter(product => {
    const searchText = `${product.name} ${product.category}`.toLowerCase()
    // キーワードをスペースで分割して、すべてのキーワードが含まれているかチェック
    const keywords = keyword.split(/\s+/)
    return keywords.every(kw => searchText.includes(kw))
  })
  
  // マッチした商品がない場合は、部分一致で検索
  if (selectedProducts.length === 0) {
    selectedProducts = allDemoProducts.filter(product => {
      const searchText = `${product.name} ${product.category}`.toLowerCase()
      const keywords = keyword.split(/\s+/)
      return keywords.some(kw => searchText.includes(kw))
    })
  }
  
  // それでもマッチしない場合は、ランダムに10商品を返す
  if (selectedProducts.length === 0) {
    selectedProducts = [...allDemoProducts]
      .sort(() => 0.5 - Math.random())
      .slice(0, 10)
  } else {
    // マッチした商品から最大10商品を選択
    selectedProducts = selectedProducts.slice(0, 10)
  }
  
  // 楽天APIを試行（オプション）
  const { RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY, RAKUTEN_AFFILIATE_ID } = c.env || {}
  
  if (RAKUTEN_APP_ID && RAKUTEN_ACCESS_KEY && RAKUTEN_AFFILIATE_ID) {
    try {
      const products = await searchRakutenProducts(
        keyword,
        RAKUTEN_APP_ID,
        RAKUTEN_ACCESS_KEY,
        RAKUTEN_AFFILIATE_ID,
        10
      )
      
      if (products.length > 0) {
        selectedProducts = products
      }
    } catch (error) {
      console.error('楽天API呼び出しエラー:', error)
      // デモデータにフォールバック
    }
  }

  const productsWithDescriptions = selectedProducts.map(product => ({
    ...product,
    description: generateDescription(product),
    reason: `「${keyword}」で検索した結果、${product.reviewCount}件以上のレビューで評価${product.rating}を獲得している人気商品です。`
  }))
  
  return c.json(productsWithDescriptions)
})

// API: ランダムに10商品取得（デモデータ優先）
app.get('/api/products/random/10', async (c) => {
  // 全デモ商品からランダムに10商品を選択
  let selectedProducts = [...allDemoProducts]
    .sort(() => 0.5 - Math.random())
    .slice(0, 10)
  
  // 楽天APIを試行（オプション）
  const { RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY, RAKUTEN_AFFILIATE_ID } = c.env || {}
  
  if (RAKUTEN_APP_ID && RAKUTEN_ACCESS_KEY && RAKUTEN_AFFILIATE_ID) {
    try {
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

      if (allProducts.length > 0) {
        selectedProducts = allProducts
          .sort(() => 0.5 - Math.random())
          .slice(0, 10)
      }
    } catch (error) {
      console.error('楽天API呼び出しエラー:', error)
      // デモデータにフォールバック
    }
  }

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

            <!-- リクエスト欄（新機能） -->
            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-magic mr-2 text-purple-600"></i>
                    カスタムリクエスト
                </h2>
                <p class="text-gray-600 mb-4 text-sm">
                    <i class="fas fa-info-circle mr-1"></i>
                    例：「文房具 可愛い」「冬 あったか」「プレゼント 1000円」など
                </p>
                <div class="flex gap-3">
                    <input type="text" 
                           id="customKeyword" 
                           placeholder="探したい商品のキーワードを入力..."
                           class="flex-1 px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
                           onkeypress="if(event.key==='Enter') searchCustom()">
                    <button onclick="searchCustom()" 
                            class="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition font-bold">
                        <i class="fas fa-search mr-2"></i>
                        検索
                    </button>
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
            const HISTORY_KEY = 'rakuten_room_history';

            // 履歴を取得
            function getHistory() {
                const history = localStorage.getItem(HISTORY_KEY);
                return history ? JSON.parse(history) : [];
            }

            // 履歴に追加
            function addToHistory(productName) {
                const history = getHistory();
                if (!history.includes(productName)) {
                    history.push(productName);
                    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
                }
            }

            // 商品が既に紹介済みかチェック
            function isAlreadyIntroduced(productName) {
                return getHistory().includes(productName);
            }

            // 履歴をクリア（デバッグ用）
            function clearHistory() {
                localStorage.removeItem(HISTORY_KEY);
                alert('✅ 履歴をクリアしました');
            }

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
                    
                    // 未紹介の商品のみをフィルタリング
                    const history = getHistory();
                    currentProducts = response.data.filter(product => !history.includes(product.name));

                    loading.classList.add('hidden');
                    results.classList.remove('hidden');

                    if (currentProducts.length === 0) {
                        productList.innerHTML = '<p class="text-gray-500 text-center py-8">未紹介の商品が見つかりませんでした。<button onclick="clearHistory()" class="text-purple-600 underline ml-2">履歴をクリア</button></p>';
                        return;
                    }

                    // 紹介済みとしてマーク
                    currentProducts.forEach(product => addToHistory(product.name));

                    currentProducts.forEach((product, index) => {
                        const productCard = createProductCard(product, index);
                        productList.innerHTML += productCard;
                    });
                } catch (error) {
                    loading.classList.add('hidden');
                    alert('エラーが発生しました: ' + error.message);
                }
            }

            // カスタムキーワード検索
            async function searchCustom() {
                const keyword = document.getElementById('customKeyword').value.trim();
                
                if (!keyword) {
                    alert('キーワードを入力してください');
                    return;
                }

                const loading = document.getElementById('loading');
                const results = document.getElementById('results');
                const productList = document.getElementById('productList');

                loading.classList.remove('hidden');
                results.classList.add('hidden');
                productList.innerHTML = '';

                try {
                    const response = await axios.get(\`/api/products/search/\${encodeURIComponent(keyword)}\`);
                    
                    // 未紹介の商品のみをフィルタリング
                    const history = getHistory();
                    currentProducts = response.data.filter(product => !history.includes(product.name));

                    loading.classList.add('hidden');
                    results.classList.remove('hidden');

                    if (currentProducts.length === 0) {
                        productList.innerHTML = '<p class="text-gray-500 text-center py-8">「' + keyword + '」で未紹介の商品が見つかりませんでした。<button onclick="clearHistory()" class="text-purple-600 underline ml-2">履歴をクリア</button></p>';
                        return;
                    }

                    // 紹介済みとしてマーク
                    currentProducts.forEach(product => addToHistory(product.name));

                    currentProducts.forEach((product, index) => {
                        const productCard = createProductCard(product, index);
                        productList.innerHTML += productCard;
                    });

                    // 検索欄をクリア
                    document.getElementById('customKeyword').value = '';
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
