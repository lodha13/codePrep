import { getUsers } from '../actions';
import { UserManagementClient } from './UserManagementClient';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UserManagementPage() {
    const users = await getUsers();

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-gray-500">View and manage user roles in the system.</p>
            <UserManagementClient initialUsers={users} />
        </div>
    );
}
