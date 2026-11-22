import { HttpTypes } from "@medusajs/types"
import { ComponentType, useCallback, useState } from "react"
import { useLoaderData, useParams } from "react-router-dom"

import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { TwoColumnPage } from "../../../components/layout/pages"
import { useProduct } from "../../../hooks/api/products"
import { useExtension } from "../../../providers/extension-provider"
import { ProductBlockers } from "./components/product-blockers"
import { ProductDescriptionSection } from "./components/product-description-section"
import { ProductHeader } from "./components/product-header"
import { ProductMediaSection } from "./components/product-media-section"
import { ProductOrganizationSection } from "./components/product-organization-section"
import { ProductSellingSection } from "./components/product-selling-section"
import { ProductShippingSection } from "./components/product-shipping-section"
import { ProductVariantSection } from "./components/product-variant-section"
import { ProductWhereSection } from "./components/product-where-section"
import { PRODUCT_DETAIL_FIELDS } from "./constants"
import { productLoader } from "./loader"
import { StockCover } from "./product-facts"
import { useProductPageFacts } from "./use-product-page-facts"

/** What a plugin card in `product.details.main` or `product.details.side` receives. */
type CardPartProps = { data: HttpTypes.AdminProduct }

const sameCover = (a: StockCover, b: StockCover) =>
  a === b || (!!a && !!b && a.row === b.row && a.summary === b.summary)

export const ProductDetail = () => {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof productLoader>
  >

  const { id } = useParams()
  const { product, isLoading, isError, error } = useProduct(
    id!,
    { fields: PRODUCT_DETAIL_FIELDS },
    {
      initialData: initialData,
    }
  )

  if (isLoading || !product) {
    return (
      <TwoColumnPageSkeleton mainSections={4} sidebarSections={4} showJSON />
    )
  }

  if (isError) {
    throw error
  }

  // Keyed by product: a part's stock cover never carries over to the next.
  return <ProductPage key={product.id} product={product} />
}

/**
 * Pagly: a fixed page instead of the drag-and-drop layout: is it selling,
 * then the product as the shopper sees it. Plugin parts go in the product
 * zones (header, where, organization, shipping, selling, and whole cards in
 * main and side), never at the page's ends. Below 1280px the side column
 * follows the main one, so a phone reads price and stock first.
 */
const ProductPage = ({ product }: { product: HttpTypes.AdminProduct }) => {
  const { getWidgets } = useExtension()
  const [cover, setCover] = useState<StockCover>(null)
  const coverStock = useCallback(
    (next: StockCover) =>
      setCover((current) => (sameCover(current, next) ? current : next)),
    []
  )
  const facts = useProductPageFacts(product, cover)

  const mainCards = getWidgets(
    "product.details.main" as any
  ) as ComponentType<CardPartProps>[]
  const sideCards = getWidgets(
    "product.details.side" as any
  ) as ComponentType<CardPartProps>[]

  return (
    <TwoColumnPage widgets={NO_PAGE_WIDGETS} data={product} showJSON hasOutlet>
      <TwoColumnPage.Main>
        <ProductHeader product={product} facts={facts} />
        <ProductBlockers product={product} facts={facts} />
        <ProductMediaSection product={product} />
        <ProductVariantSection product={product} facts={facts} />
        <ProductDescriptionSection product={product} />
        {mainCards.map((Card, index) => (
          <Card key={index} data={product} />
        ))}
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <ProductWhereSection product={product} />
        <ProductOrganizationSection product={product} />
        <ProductShippingSection product={product} />
        <ProductSellingSection product={product} onCoverStock={coverStock} />
        {sideCards.map((Card, index) => (
          <Card key={index} data={product} />
        ))}
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

const NO_PAGE_WIDGETS = { before: [], after: [], sideBefore: [], sideAfter: [] }
