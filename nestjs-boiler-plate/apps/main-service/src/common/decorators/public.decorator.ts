import { SetMetadata } from '@nestjs/common';

export const META_UNPROTECTED = 'unprotected'; // Warning: Keycloak internal constant might differ, but nest-keycloak-connect exports 'Unprotected' or 'Public' usually.
// Better use the library's decorator directly, but let's check if it exports it.
// Wait, nest-keycloak-connect exports Unprotected, Public, Resource, Roles, Scopes.

// Let's create a file that exports the library's Public decorator to be consistent or just use it directly in controllers.
// Actually, I'll just skip creating a custom one if the library provides it.
// I will check imports in AuthController to see what I need.
