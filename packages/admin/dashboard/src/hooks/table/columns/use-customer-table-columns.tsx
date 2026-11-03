import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"

import {
  EmailCell,
  EmailHeader,
} from "../../../components/table/table-cells/common/email-cell"
import {
  NameCell,
  NameHeader,
} from "../../../components/table/table-cells/common/name-cell"
import {
  AccountCell,
  AccountHeader,
} from "../../../components/table/table-cells/customer/account-cell/account-cell"
import {
  EmailSubscriptionCell,
  EmailSubscriptionHeader,
} from "../../../components/table/table-cells/customer/email-subscription-cell/email-subscription-cell"
import {
  FirstSeenCell,
  FirstSeenHeader,
} from "../../../components/table/table-cells/customer/first-seen-cell"
import { HttpTypes } from "@medusajs/types"

const columnHelper = createColumnHelper<HttpTypes.AdminCustomer>()

export const useCustomerTableColumns = () => {
  return useMemo(
    () => [
      columnHelper.accessor("email", {
        header: () => <EmailHeader />,
        cell: ({ getValue }) => <EmailCell email={getValue()} />,
      }),
      columnHelper.display({
        id: "name",
        header: () => <NameHeader />,
        cell: ({
          row: {
            original: { first_name, last_name },
          },
        }) => <NameCell firstName={first_name} lastName={last_name} />,
      }),
      columnHelper.accessor("has_account", {
        header: () => <AccountHeader />,
        cell: ({ getValue }) => <AccountCell hasAccount={getValue()} />,
      }),
      // Pagly: Shopify's "Email subscription" column, from @pagly/storefront's consent in metadata.
      columnHelper.display({
        id: "email_subscription",
        header: () => <EmailSubscriptionHeader />,
        cell: ({
          row: {
            original: { metadata },
          },
        }) => <EmailSubscriptionCell metadata={metadata} />,
      }),
      columnHelper.accessor("created_at", {
        header: () => <FirstSeenHeader />,
        cell: ({ getValue }) => <FirstSeenCell createdAt={getValue()} />,
      }),
    ],
    []
  )
}
