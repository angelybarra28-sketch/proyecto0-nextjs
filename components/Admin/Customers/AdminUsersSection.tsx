'use client';

import { useState } from 'react';
import type { AdminUserView } from '@/lib/types';
import type { AdminCustomerView } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

type AdminUsersSectionProps = {
  users: AdminUserView[];
  onToggleUser: (id: string, isActive: boolean) => void;
  customers?: AdminCustomerView[];
  onLinkCustomer?: (customerId: string, userId: string) => Promise<void>;
  onUnlinkCustomer?: (customerId: string) => Promise<void>;
};

type LinkingState = {
  userId: string;
  searchTerm: string;
  selectedCustomer: AdminCustomerView | null;
  showResults: boolean;
};

export function AdminUsersSection({ users, onToggleUser, customers, onLinkCustomer, onUnlinkCustomer }: AdminUsersSectionProps) {
  const [linking, setLinking] = useState<LinkingState | null>(null);

  const getLinkedCustomers = (userId: string): AdminCustomerView[] => {
    if (!customers) return [];
    return customers.filter((c) => c.user_id === userId);
  };

  const availableCustomers = customers?.filter((c) => c.user_id === null) || [];

  const filteredCustomers = linking
    ? availableCustomers.filter((c) => {
        const term = linking.searchTerm.toLowerCase().trim();
        if (!term) return true;
        const nameMatch = c.full_name.toLowerCase().includes(term);
        const cardMatch = c.operation_numbers?.some((op) => op.toLowerCase().includes(term));
        return nameMatch || cardMatch;
      })
    : [];

  const handleLink = async () => {
    if (!linking?.selectedCustomer || !onLinkCustomer) return;
    await onLinkCustomer(linking.selectedCustomer.id, linking.userId);
    setLinking(null);
  };

  const handleUnlink = async (customerId: string) => {
    if (!onUnlinkCustomer) return;
    await onUnlinkCustomer(customerId);
  };

  const openLinking = (userId: string) => {
    setLinking({ userId, searchTerm: '', selectedCustomer: null, showResults: true });
  };

  const selectCustomer = (customer: AdminCustomerView) => {
    setLinking((prev) => prev ? { ...prev, selectedCustomer: customer, searchTerm: customer.full_name, showResults: false } : null);
  };

  const clearSelection = () => {
    setLinking((prev) => prev ? { ...prev, selectedCustomer: null, searchTerm: '', showResults: true } : null);
  };

  const cancelLinking = () => {
    setLinking(null);
  };

  const bestCardNumber = (customer: AdminCustomerView): string | null => {
    if (!customer.operation_numbers || customer.operation_numbers.length === 0) return null;
    return customer.operation_numbers[0];
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Usuarios Registrados ({users.length})</h2>

      {users.length === 0 ? (
        <p className={styles.empty}>No hay usuarios registrados</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const linkedCustomers = getLinkedCustomers(user.id);
                const isLinking = linking?.userId === user.id;
                return (
                  <tr key={user.id}>
                    <td>{user.nombreApellido}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`${styles.status} ${user.isActive ? styles.completed : styles.cancelled}`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      {isLinking ? (
                        <div className={styles.searchWrapper}>
                          <div className={styles.searchInputRow}>
                            <input
                              type="text"
                              value={linking.selectedCustomer ? linking.selectedCustomer.full_name : linking.searchTerm}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLinking((prev) => prev
                                  ? { ...prev, searchTerm: val, selectedCustomer: null, showResults: true }
                                  : null);
                              }}
                              placeholder="Buscar por nombre o N° tarjeta..."
                              className={styles.searchInput}
                            />
                            {linking.selectedCustomer && (
                              <button onClick={clearSelection} className={styles.clearBtn} title="Limpiar selección">
                                ✕
                              </button>
                            )}
                          </div>

                          {linking.showResults && (
                            <div className={styles.searchResults}>
                              {filteredCustomers.length === 0 ? (
                                <div className={styles.searchEmpty}>Sin resultados</div>
                              ) : (
                                filteredCustomers.map((c) => (
                                  <div
                                    key={c.id}
                                    className={styles.searchResultItem}
                                    onClick={() => selectCustomer(c)}
                                  >
                                    <div className={styles.searchResultName}>{c.full_name}</div>
                                    <div className={styles.searchResultMeta}>
                                      {c.phone && <span>{c.phone}</span>}
                                      {bestCardNumber(c) && (
                                        <span className={styles.searchResultCard}>N° {bestCardNumber(c)}</span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          <div className={styles.linkActions}>
                            <button
                              onClick={handleLink}
                              disabled={!linking.selectedCustomer}
                              className={styles.smallBtn}
                            >
                              Vincular
                            </button>
                            <button onClick={cancelLinking} className={styles.smallBtn}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : linkedCustomers.length > 0 ? (
                        <div className={styles.linkedBlock}>
                          {linkedCustomers.map((customer) => (
                            <div key={customer.id}>
                              <div className={styles.linkedHeader}>
                                <strong className={styles.linkedName}>{customer.full_name}</strong>
                                <button
                                  onClick={() => handleUnlink(customer.id)}
                                  className={styles.unlinkBtn}
                                  title="Desvincular cliente"
                                >
                                  Desvincular
                                </button>
                              </div>
                              {customer.credit_accounts && customer.credit_accounts.length > 0 ? (
                                <div className={styles.creditAccountList}>
                                  {customer.credit_accounts.map((acc) => (
                                    <div key={acc.id} className={styles.creditAccountItem}>
                                      <span className={styles.creditAccountProduct}>{acc.product_name}</span>
                                      {acc.operation_number && (
                                        <span className={styles.creditAccountOp}>N° {acc.operation_number}</span>
                                      )}
                                      <span className={styles.creditAccountDate}>
                                        {new Date(acc.sale_date).toLocaleDateString()}
                                      </span>
                                      <span className={styles.creditAccountAmount}>
                                        ${Number(acc.installment_amount).toLocaleString()} x {acc.installment_count}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className={styles.creditAccountEmpty}>Sin cuentas corrientes</div>
                              )}
                            </div>
                          ))}
                          <button onClick={() => openLinking(user.id)} className={styles.linkBtn}>
                            Vincular cliente
                          </button>
                        </div>
                      ) : customers ? (
                        <button onClick={() => openLinking(user.id)} className={styles.linkBtn}>
                          Vincular cliente
                        </button>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => onToggleUser(user.id, !user.isActive)}
                        className={styles.deleteBtn}
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
