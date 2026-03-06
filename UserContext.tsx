import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';

export type VisionCondition =
  | 'low_vision'
  | 'legally_blind'
  | 'totally_blind'
  | 'color_blind'
  | 'tunnel_vision'
  | 'light_sensitivity'
  | 'other';

export type AssistancePreference = 'voice' | 'haptic' | 'both';

export interface UserProfile {
  name: string;
  age: string;
  email: string;
  visionCondition: VisionCondition | '';
  visionDetails: string;
  usesScreenReader: boolean;
  assistancePreference: AssistancePreference;
  emergencyContactName: string;
  emergencyContactPhone: string;
  hasCompletedProfile: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  email: string;
  userId: string;
}

const defaultProfile: UserProfile = {
  name: '',
  age: '',
  email: '',
  visionCondition: '',
  visionDetails: '',
  usesScreenReader: false,
  assistancePreference: 'voice',
  emergencyContactName: '',
  emergencyContactPhone: '',
  hasCompletedProfile: false,
};

const PROFILE_STORAGE_KEY = 'user_profile';
const AUTH_STORAGE_KEY = 'user_auth';

export const [UserProvider, useUser] = createContextHook(() => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    email: '',
    userId: '',
  });
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userId = session.user.id;
        const email = session.user.email || '';
        setAuth({ isAuthenticated: true, email, userId });
        console.log('Supabase session restored for:', email);

        await loadProfileFromSupabase(userId);
      } else {
        const localAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (localAuth) {
          const parsed = JSON.parse(localAuth) as AuthState;
          if (parsed.isAuthenticated) {
            setAuth(parsed);
            await loadProfileFromLocal();
          }
        }
        console.log('No active Supabase session');
      }
    } catch (error) {
      console.log('Error initializing auth:', error);
      await loadProfileFromLocal();
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('Error fetching profile from Supabase:', error.message);
        await loadProfileFromLocal();
        return;
      }

      if (data) {
        const loadedProfile: UserProfile = {
          name: data.name || '',
          age: data.age || '',
          email: data.email || '',
          visionCondition: data.vision_condition || '',
          visionDetails: data.vision_details || '',
          usesScreenReader: data.uses_screen_reader || false,
          assistancePreference: data.assistance_preference || 'voice',
          emergencyContactName: data.emergency_contact_name || '',
          emergencyContactPhone: data.emergency_contact_phone || '',
          hasCompletedProfile: data.has_completed_profile || false,
        };
        setProfile(loadedProfile);
        await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(loadedProfile));
        console.log('Profile loaded from Supabase:', loadedProfile.name);
      } else {
        await loadProfileFromLocal();
      }
    } catch (error) {
      console.log('Error loading profile from Supabase:', error);
      await loadProfileFromLocal();
    }
  };

  const loadProfileFromLocal = async () => {
    try {
      const profileData = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (profileData) {
        const parsed = JSON.parse(profileData) as UserProfile;
        setProfile(parsed);
        console.log('Profile loaded from local storage:', parsed.name);
      }
    } catch (error) {
      console.log('Error loading profile from local:', error);
    }
  };

  const syncProfileToSupabase = async (profileData: UserProfile, userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          name: profileData.name,
          age: profileData.age,
          email: profileData.email,
          vision_condition: profileData.visionCondition,
          vision_details: profileData.visionDetails,
          uses_screen_reader: profileData.usesScreenReader,
          assistance_preference: profileData.assistancePreference,
          emergency_contact_name: profileData.emergencyContactName,
          emergency_contact_phone: profileData.emergencyContactPhone,
          has_completed_profile: profileData.hasCompletedProfile,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.log('Error syncing profile to Supabase:', error.message);
      } else {
        console.log('Profile synced to Supabase');
      }
    } catch (error) {
      console.log('Error syncing profile:', error);
    }
  };

  const signUp = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.log('Supabase signUp error:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userId = data.user.id;
        const newAuth: AuthState = { isAuthenticated: true, email: email.trim(), userId };
        setAuth(newAuth);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuth));
        console.log('Sign up successful for:', email);
        return { success: true };
      }

      return { success: false, error: 'Something went wrong. Please try again.' };
    } catch (error) {
      console.log('Sign up error:', error);
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.log('Supabase signIn error:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userId = data.user.id;
        const newAuth: AuthState = { isAuthenticated: true, email: email.trim(), userId };
        setAuth(newAuth);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuth));

        await loadProfileFromSupabase(userId);
        console.log('Sign in successful for:', email);
        return { success: true };
      }

      return { success: false, error: 'Invalid email or password.' };
    } catch (error) {
      console.log('Sign in error:', error);
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuth({ isAuthenticated: false, email: '', userId: '' });
      setProfile(defaultProfile);
      console.log('Signed out');
    } catch (error) {
      console.log('Sign out error:', error);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      const newProfile = { ...profile, ...updates };
      setProfile(newProfile);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));

      if (auth.userId) {
        void syncProfileToSupabase(newProfile, auth.userId);
      }
      console.log('Profile updated:', Object.keys(updates));
    } catch (error) {
      console.log('Error updating profile:', error);
    }
  }, [profile, auth.userId]);

  const completeProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...profileData, hasCompletedProfile: true };
    try {
      setProfile(newProfile);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));

      if (auth.userId) {
        await syncProfileToSupabase(newProfile, auth.userId);
      }
      console.log('Profile completed for:', newProfile.name);
    } catch (error) {
      console.log('Error completing profile:', error);
    }
  }, [profile, auth.userId]);

  const firstName = useMemo(() => {
    if (!profile.name) return '';
    return profile.name.split(' ')[0];
  }, [profile.name]);

  return useMemo(() => ({
    auth,
    profile,
    isLoading,
    firstName,
    signUp,
    signIn,
    signOut,
    updateProfile,
    completeProfile,
  }), [auth, profile, isLoading, firstName, signUp, signIn, signOut, updateProfile, completeProfile]);
});
