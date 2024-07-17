import { useCallback, useState } from "react"
import { fakeFetch } from "../../utils/fetch"
import { SuccessResponse } from "../../utils/types"
import { InputCheckbox } from "../InputCheckbox"
import { TransactionPaneComponent } from "./types"

export const TransactionPane: TransactionPaneComponent = ({ transaction, approved, onToggle }) => {
  const [localApproved, setLocalApproved] = useState(approved)

  const setTransactionApproval = useCallback(
    async (newValue: boolean) => {
      await fakeFetch<SuccessResponse>("setTransactionApproval", {
        transactionId: transaction.id,
      })
      setLocalApproved(newValue)
      onToggle(transaction.id, newValue)
    },
    [transaction.id, onToggle]
  )

  return (
    <div className="RampPane">
      <div className="RampPane--content">
        <p className="RampText">{transaction.merchant} </p>
        <b>{moneyFormatter.format(transaction.amount)}</b>
        <p className="RampText--hushed RampText--s">
          {transaction.employee.firstName} {transaction.employee.lastName} - {transaction.date}
        </p>
      </div>
      <InputCheckbox id={transaction.id} checked={localApproved} onChange={setTransactionApproval} />
    </div>
  )
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})
