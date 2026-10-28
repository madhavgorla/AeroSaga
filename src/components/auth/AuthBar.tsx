import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logoutUser } from '../../services/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useToast } from '../ui/Toast';

export const AuthBar: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const signedInUser = await loginWithGoogle();
      showToast({
        type: 'success',
        title: 'Authenticated as Operator',
        description: `Welcome back, ${signedInUser.displayName || 'Operator'}! Flight control session authenticated.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Authentication Error',
        description: err?.message || 'Could not complete Google sign-in.',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      showToast({
        type: 'info',
        title: 'Logged Out',
        description: 'Operator session ended.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Logout Failed',
        description: err?.message || 'Error during sign out.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-numbers">
        <span>Authenticating...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 p-1 pl-2.5 rounded-lg text-xs">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-5 h-5 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center text-[10px]">
              <UserIcon className="w-3 h-3" />
            </div>
          )}

          <div className="hidden sm:flex flex-col text-left pr-1">
            <span className="font-semibold text-slate-200 text-[11px] leading-tight">
              {user.displayName || 'Flight Controller'}
            </span>
            <span className="text-[9px] text-emerald-400 font-mono-numbers flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              <span>Operator Session</span>
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleSignIn}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <LogIn className="w-3.5 h-3.5 text-sky-400" />
          <span>Operator Sign In</span>
        </button>
      )}
    </div>
  );
};
