import { SetMetadata } from '@nestjs/common';

export const POLICY_MODULE_KEY = 'policy_module';

export const PolicyModule = (moduleCode: string) => SetMetadata(POLICY_MODULE_KEY, moduleCode);
