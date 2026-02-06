import { useQuery } from '@tanstack/react-query';
import { userService, type UserProfile } from '../services/user-profile.service';

export const useProfile = () => {
    const {
        data: profile,
        isLoading,
        error,
        refetch,
    } = useQuery<UserProfile>({
        queryKey: ['user-profile'],
        queryFn: userService.getMyProfile,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        profile,
        isLoading,
        error,
        refetch,
    };
};
