'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminUsersSection } from '@/components/Admin/Customers/AdminUsersSection';
import { CustomerMetricsSection } from '@/components/Admin/Customers/CustomerMetricsSection';
import { CustomerSalesSummarySection } from '@/components/Admin/Customers/CustomerSalesSummarySection';
import { useAdminAccess, useAdminSales, useAdminUsers } from '@/components/Admin/useAdminData';
import { fetchAdminCustomers, linkCustomerToUser } from '@/lib/services/admin/client';
import type { AdminCustomerView } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

export function AdminCustomersPage() {
  const { isAdmin } = useAdminAccess();
  const { sales } = useAdminSales(isAdmin);
  const { users, handleToggleUser, reloadUsers } = useAdminUsers(isAdmin);
  const [customers, setCustomers] = useState<AdminCustomerView[]>([]);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await fetchAdminCustomers();
      setCustomers(data);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadCustomers();
    }
  }, [isAdmin, loadCustomers]);

  const handleLinkCustomer = useCallback(async (customerId: string, userId: string) => {
    await linkCustomerToUser(customerId, userId);
    await loadCustomers();
    await reloadUsers();
  }, [loadCustomers, reloadUsers]);

  const handleUnlinkCustomer = useCallback(async (customerId: string) => {
    await linkCustomerToUser(customerId, null);
    await loadCustomers();
    await reloadUsers();
  }, [loadCustomers, reloadUsers]);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Clientes</h1>
      <div className={styles.sections}>
        <CustomerMetricsSection sales={sales} />
        <CustomerSalesSummarySection sales={sales} />
        <AdminUsersSection
          users={users}
          onToggleUser={handleToggleUser}
          customers={customers}
          onLinkCustomer={handleLinkCustomer}
          onUnlinkCustomer={handleUnlinkCustomer}
        />
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
