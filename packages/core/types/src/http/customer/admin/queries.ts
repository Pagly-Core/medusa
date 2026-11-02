import { FindParams, SelectParams } from "../../common"
import {
  BaseCustomerAddressFilters,
  BaseCustomerFilters,
  CustomerGroupInCustomerFilters,
} from "../common"

export interface AdminCustomerFilters extends BaseCustomerFilters {
  /**
   * Apply customer group filters to retrieve their customers.
   */
  groups?: CustomerGroupInCustomerFilters | string[] | string
  /**
   * Filter by whether the customer is registered.
   */
  has_account?: boolean
  // Pagly: email marketing consent, which @pagly/storefront keeps in metadata.email_marketing.
  /**
   * Filter by whether the customer is subscribed to email marketing.
   */
  email_subscribed?: boolean
}
export interface AdminCustomerAddressFilters
  extends BaseCustomerAddressFilters,
    FindParams {}

export interface AdminCustomerParams extends SelectParams {}

export interface AdminCustomerGroupInCustomerParams {
  created_at?: any
  id?: string | string[] | undefined
  updated_at?: any
  deleted_at?: any
  name?: string | string[] | undefined
}

export interface AdminCustomerAddressParams extends SelectParams {}
