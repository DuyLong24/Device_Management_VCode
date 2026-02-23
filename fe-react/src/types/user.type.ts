export interface User {
    id: string;
    username: string;
    email: string;
    name: string;
    roles?: string[];
    permissions?: string[];
}
