import type { AdminUserView } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

type AdminUsersSectionProps = {
  users: AdminUserView[];
  onToggleUser: (id: string, isActive: boolean) => void;
};

export function AdminUsersSection({ users, onToggleUser }: AdminUsersSectionProps) {
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
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.nombreApellido}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`${styles.status} ${user.isActive ? styles.completed : styles.cancelled}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
