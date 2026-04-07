export type ScrapedProduct = {
    platform:"coupang" | "shoppe" | "tiktok" | "unknown"
    sourceUrl: string 
    title: string 
    price: string 
    description: string 
    discountRate: string 
    images: string[]
    raw?: Record<string,unknown>
}