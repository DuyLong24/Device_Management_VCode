import { SetMetadata } from '@nestjs/common';

export const POLICY_EXCLUDE_KEY = 'policy_exclude';

export const PolicyExclude = () => SetMetadata(POLICY_EXCLUDE_KEY, true);
