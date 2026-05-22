import type { User } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

type AdminUsersSectionProps = {
  users: User[];
  onDeleteUser: (id: string) => void;
};

export function AdminUsersSection({ users, onDeleteUser }: AdminUsersSectionProps) {
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
                <th>DNI</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Domicilio</th>
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.dni}</td>
                  <td>{user.nombreApellido}</td>
                  <td>{user.email}</td>
                  <td>{user.telefono}</td>
                  <td>{user.domicilio}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className={styles.deleteBtn}
                    >
                      Eliminar
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
