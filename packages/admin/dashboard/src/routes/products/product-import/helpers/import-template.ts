// Pagly: neutral sample products with no upstream-hosted images. Priced in
// UYU and USD, the currencies a store sells in, and imported as drafts so the
// samples never go live (Pagly-Core/pagly-app#354).
const ProductImportCSV =
  "data:text/csv;charset=utf-8," +
  `Product Id,Product Handle,Product Title,Product Subtitle,Product Description,Product Status,Product Thumbnail,Product Weight,Product Length,Product Width,Product Height,Product HS Code,Product Origin Country,Product MID Code,Product Material,Shipping Profile Id,Product Sales Channel 1,Product Collection Id,Product Type Id,Product Tag 1,Product Discountable,Product External Id,Variant Id,Variant Title,Variant SKU,Variant Barcode,Variant Allow Backorder,Variant Manage Inventory,Variant Weight,Variant Length,Variant Width,Variant Height,Variant HS Code,Variant Origin Country,Variant MID Code,Variant Material,Variant Price UYU,Variant Price USD,Variant Option 1 Name,Variant Option 1 Value,Product Image 1 Url,Product Image 2 Url
,sample-coffee-mug,Ceramic Coffee Mug,,A stoneware mug for the morning coffee.,draft,,400,,,,,,,,,,,,,TRUE,,,One Size,,,FALSE,TRUE,,,,,,,,,690,,Size,One Size,,
,sample-sweatpants,Cotton Sweatpants,,"Soft cotton sweatpants with an elastic waist, made for every day.",draft,,400,,,,,,,,,,,,,TRUE,,,S,,,FALSE,TRUE,,,,,,,,,1490,,Size,S,,
,sample-sweatpants,Cotton Sweatpants,,"Soft cotton sweatpants with an elastic waist, made for every day.",draft,,400,,,,,,,,,,,,,TRUE,,,M,,,FALSE,TRUE,,,,,,,,,1490,,Size,M,,
,sample-sweatpants,Cotton Sweatpants,,"Soft cotton sweatpants with an elastic waist, made for every day.",draft,,400,,,,,,,,,,,,,TRUE,,,L,,,FALSE,TRUE,,,,,,,,,1490,,Size,L,,
,sample-sweatpants,Cotton Sweatpants,,"Soft cotton sweatpants with an elastic waist, made for every day.",draft,,400,,,,,,,,,,,,,TRUE,,,XL,,,FALSE,TRUE,,,,,,,,,1490,,Size,XL,,`

export const getProductImportCsvTemplate = () => {
  return encodeURI(ProductImportCSV)
}
