import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { Employee } from "./utils/types"
import { InputSelect } from "./components/InputSelect"
import { TransactionPane } from "./components/Transaction"
import { Instructions } from "./components/Instructions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"

export function App() {
  const { data: employees, loading: employeesLoading, ...employeeUtils } = useEmployees()
  const {
    data: paginatedTransactions,
    loading: transactionsLoading,
    ...paginatedTransactionsUtils
  } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [transactionState, setTransactionState] = useState<{ [id: string]: boolean }>({})

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  const loadAllTransactions = useCallback(async () => {
    transactionsByEmployeeUtils.invalidateData()
    setSelectedEmployee(null)
    setIsLoadingMore(true)

    try {
      await employeeUtils.fetchAll()
      const initialTransactions = await paginatedTransactionsUtils.fetchAll()
      if (initialTransactions && initialTransactions.data) {
        setAllTransactions(initialTransactions.data)
        setTransactionState((prev) => ({
          ...prev,
          ...Object.fromEntries(initialTransactions.data.map((tx) => [tx.id, tx.approved])),
        }))
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      setSelectedEmployee(employeeId)
      const employeeTransactions = await transactionsByEmployeeUtils.fetchById(employeeId)
      if (employeeTransactions) {
        setAllTransactions(employeeTransactions)
        setTransactionState((prev) => ({
          ...prev,
          ...Object.fromEntries(employeeTransactions.map((tx) => [tx.id, tx.approved])),
        }))
      }
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  const viewMoreTransactions = useCallback(async () => {
    setIsLoadingMore(true)
    try {
      const nextPage = paginatedTransactions?.nextPage
      if (nextPage) {
        const moreTransactions = await paginatedTransactionsUtils.fetchAll({ page: nextPage })
        if (moreTransactions && moreTransactions.data) {
          setAllTransactions((prevTransactions) => [...prevTransactions, ...moreTransactions.data])
          setTransactionState((prev) => ({
            ...prev,
            ...Object.fromEntries(moreTransactions.data.map((tx) => [tx.id, tx.approved])),
          }))
          setCurrentPage(nextPage)
        }
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [paginatedTransactions, paginatedTransactionsUtils])

  const handleToggleTransaction = useCallback((id: string, approved: boolean) => {
    setTransactionState((prev) => ({ ...prev, [id]: approved }))
  }, [])

  useEffect(() => {
    if (employees === null && !employeesLoading) {
      loadAllTransactions()
    }
  }, [employeesLoading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeesLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) {
              return
            } else if (newValue.id === "") {
              await loadAllTransactions()
            } else {
              await loadTransactionsByEmployee(newValue.id)
            }
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          {transactions === null ? (
            <div className="RampLoading--container">Loading...</div>
          ) : (
            <Fragment>
              <div data-testid="transaction-container">
                {transactions.map((transaction) => (
                  <TransactionPane
                    key={transaction.id}
                    transaction={transaction}
                    approved={transactionState[transaction.id] ?? transaction.approved}
                    onToggle={handleToggleTransaction}
                  />
                ))}
              </div>
              {selectedEmployee === null && paginatedTransactions?.nextPage !== null && (
                <button
                  className="RampButton"
                  disabled={isLoadingMore || transactionsLoading}
                  onClick={viewMoreTransactions}
                >
                  View More
                </button>
              )}
            </Fragment>
          )}
        </div>
      </main>
    </Fragment>
  )
}
