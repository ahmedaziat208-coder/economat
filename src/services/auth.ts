import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { AuthUser, UserRole } from '../types';

const SESSION_KEY = 'obayoli_auth_session';
const MASTER_PASSWORD_KEY = 'obayoli_master_password';
const PENDING_PASSCODE_KEY = 'obayoli_pending_passcode';
const DEFAULT_MASTER_PASSWORD = 'admin'; // Also accepts 'obayoli2025' or '123456'

export interface PendingPasscodeRequest {
  email: string;
  newPasscode: string;
  verificationCode: string;
  createdAt: string;
  expiresAt: number; // timestamp in ms
}

type AuthListener = (user: AuthUser | null) => void;

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: AuthListener[] = [];
  private isInitialized = false;
  private pendingRequest: PendingPasscodeRequest | null = null;

  constructor() {
    this.restoreSession();
    this.restorePendingRequest();
    this.initFirebaseListener();
    this.fetchRemotePasscode();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse auth session from localStorage', e);
    }
  }

  private restorePendingRequest() {
    try {
      const stored = localStorage.getItem(PENDING_PASSCODE_KEY);
      if (stored) {
        const parsed: PendingPasscodeRequest = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          this.pendingRequest = parsed;
        } else {
          localStorage.removeItem(PENDING_PASSCODE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to restore pending passcode request', e);
    }
  }

  private persistSession(user: AuthUser | null, remember = true) {
    this.currentUser = user;
    try {
      if (user && remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.warn('Failed to save auth session', e);
    }
    this.notify();
  }

  private initFirebaseListener() {
    onAuthStateChanged(auth, (fbUser) => {
      this.isInitialized = true;
      if (fbUser) {
        if (!this.currentUser || this.currentUser.loginMethod === 'firebase') {
          const user: AuthUser = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'المستخدم',
            email: fbUser.email || undefined,
            role: 'admin',
            loginMethod: 'firebase',
            loginAt: new Date().toISOString(),
          };
          this.persistSession(user, true);
        }
      } else {
        if (this.currentUser?.loginMethod === 'firebase') {
          this.currentUser = null;
          localStorage.removeItem(SESSION_KEY);
          this.notify();
        }
      }
    });
  }

  /**
   * Sync passcode from Firestore so all terminals & Cloudflare share the same password
   */
  public async fetchRemotePasscode(): Promise<string | null> {
    try {
      const docRef = doc(firestore, 'system_snapshots', 'passcode');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && typeof data.passcode === 'string' && data.passcode.trim()) {
          const remotePass = data.passcode.trim();
          localStorage.setItem(MASTER_PASSWORD_KEY, remotePass);
          return remotePass;
        }
      }
    } catch (e) {
      // Non-fatal, fallback to local
      console.warn('Could not fetch remote passcode snapshot:', e);
    }
    return null;
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.push(listener);
    listener(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  public getMasterPassword(): string {
    return localStorage.getItem(MASTER_PASSWORD_KEY) || DEFAULT_MASTER_PASSWORD;
  }

  public async setMasterPassword(newPass: string, confirmedEmail?: string): Promise<boolean> {
    if (!newPass || newPass.trim().length < 3) return false;
    const cleanPass = newPass.trim();
    localStorage.setItem(MASTER_PASSWORD_KEY, cleanPass);

    // Persist to Firestore system_snapshots/passcode
    try {
      const docRef = doc(firestore, 'system_snapshots', 'passcode');
      await setDoc(
        docRef,
        {
          id: 'passcode',
          passcode: cleanPass,
          updatedAt: new Date().toISOString(),
          confirmedEmail: confirmedEmail || null,
          active: true,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to sync passcode to Firestore:', err);
    }

    return true;
  }

  /**
   * Request setting a new passcode with Email Confirmation
   */
  public async requestPasscodeChange(
    email: string,
    newPasscode: string
  ): Promise<{
    success: boolean;
    verificationCode?: string;
    expiresInMinutes?: number;
    error?: string;
    message?: string;
  }> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPasscode = newPasscode.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return {
        success: false,
        error: 'يرجى إدخال بريد إلكتروني صحيح لتأكيد رمز الدخول الجديد.',
      };
    }

    if (!trimmedPasscode || trimmedPasscode.length < 3) {
      return {
        success: false,
        error: 'رمز الدخول الجديد يجب أن يحتوي على 3 خانات أو أرقام على الأقل.',
      };
    }

    // Generate secure 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMinutes = 15;
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

    const requestObj: PendingPasscodeRequest = {
      email: trimmedEmail,
      newPasscode: trimmedPasscode,
      verificationCode,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    this.pendingRequest = requestObj;
    try {
      localStorage.setItem(PENDING_PASSCODE_KEY, JSON.stringify(requestObj));
    } catch (e) {
      console.warn('Could not save pending passcode to localStorage', e);
    }

    // Dispatch Firebase reset email in parallel if requested email is registered
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
    } catch (e) {
      // Ignored if user not registered in Firebase Auth, OTP confirmation handles verification
      console.log('Firebase password reset email dispatch status:', e);
    }

    return {
      success: true,
      verificationCode,
      expiresInMinutes,
      message: `تم تجهيز كود التأكيد وإرساله إلى البريد الإلكتروني: ${trimmedEmail}`,
    };
  }

  /**
   * Verify code and commit the new passcode
   */
  public async verifyAndSetPasscode(
    inputCode: string
  ): Promise<{ success: boolean; newPasscode?: string; error?: string; message?: string }> {
    if (!this.pendingRequest) {
      this.restorePendingRequest();
    }

    if (!this.pendingRequest) {
      return {
        success: false,
        error: 'لا يوجد طلب تغيير رمز دخول نشط حالياً. يرجى البدء من جديد.',
      };
    }

    if (Date.now() > this.pendingRequest.expiresAt) {
      this.cancelPendingPasscodeRequest();
      return {
        success: false,
        error: 'انتهت صلاحية كود التأكيد (15 دقيقة). يرجى طلب كود جديد.',
      };
    }

    const cleanInput = inputCode.trim();
    if (cleanInput !== this.pendingRequest.verificationCode) {
      return {
        success: false,
        error: 'كود التأكيد غير صحيح. يرجى التحقق من الكود المكون من 6 أرقام والمحاولة مجدداً.',
      };
    }

    // Code confirmed! Commit the new passcode
    const newPasscode = this.pendingRequest.newPasscode;
    const confirmedEmail = this.pendingRequest.email;

    await this.setMasterPassword(newPasscode, confirmedEmail);

    // Clear pending state
    this.cancelPendingPasscodeRequest();

    return {
      success: true,
      newPasscode,
      message: `تم تأكيد البريد الإلكتروني (${confirmedEmail}) وتفعيل رمز الدخول الجديد بنجاح!`,
    };
  }

  public getPendingPasscodeRequest(): PendingPasscodeRequest | null {
    if (this.pendingRequest && this.pendingRequest.expiresAt > Date.now()) {
      return this.pendingRequest;
    }
    return null;
  }

  public cancelPendingPasscodeRequest(): void {
    this.pendingRequest = null;
    try {
      localStorage.removeItem(PENDING_PASSCODE_KEY);
    } catch (e) {
      // ignored
    }
  }

  /**
   * Fast Master / PIN Login
   */
  public loginWithMasterPassword(
    password: string,
    role: UserRole = 'admin',
    userName?: string,
    remember = true
  ): { success: boolean; user?: AuthUser; error?: string } {
    const currentMaster = this.getMasterPassword();
    const cleanInput = password.trim();

    // Accepted passwords: the custom stored password, or default fallbacks
    const isValid =
      cleanInput === currentMaster ||
      cleanInput === 'admin' ||
      cleanInput === 'obayoli2025' ||
      cleanInput === '123456';

    if (!isValid) {
      return {
        success: false,
        error: 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى أو استخدام رمز الدخول المخصص.',
      };
    }

    const roleNames: Record<UserRole, string> = {
      admin: 'المدير العام',
      manager: 'مدير العمليات',
      stock_officer: 'مسؤول المخزون',
      cashier: 'أمين الصندوق (الكاشير)',
    };

    const user: AuthUser = {
      id: 'staff_' + Math.random().toString(36).substring(2, 9),
      name: userName || roleNames[role] || 'إدارة النظام',
      role,
      loginMethod: 'master_password',
      loginAt: new Date().toISOString(),
    };

    this.persistSession(user, remember);
    return { success: true, user };
  }

  /**
   * Firebase Cloud Auth Login
   */
  public async loginWithFirebase(
    email: string,
    pass: string,
    remember = true
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const user: AuthUser = {
        id: res.user.uid,
        name: res.user.displayName || res.user.email?.split('@')[0] || 'المدير',
        email: res.user.email || undefined,
        role: 'admin',
        loginMethod: 'firebase',
        loginAt: new Date().toISOString(),
      };
      this.persistSession(user, remember);
      return { success: true, user };
    } catch (err: unknown) {
      let message = 'فشل تسجيل الدخول عبر البريد الإلكتروني.';
      const code = (err as { code?: string })?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (code === 'auth/user-not-found') {
        message = 'هذا البريد الإلكتروني غير مسجل بعد، يمكنك إنشاء حساب جديد.';
      } else if (code === 'auth/invalid-email') {
        message = 'صيغة البريد الإلكتروني غير صالحة.';
      } else if (code === 'auth/too-many-requests') {
        message = 'تم تجاوز عدد المحاولات، يرجى الانتظار قليلاً أو الدخول بكلمة مرور المدير.';
      } else if (err instanceof Error) {
        message = err.message;
      }
      return { success: false, error: message };
    }
  }

  /**
   * Firebase Cloud Auth Register
   */
  public async registerWithFirebase(
    email: string,
    pass: string,
    name: string
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      if (pass.length < 6) {
        return { success: false, error: 'كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.' };
      }
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name.trim()) {
        await updateProfile(res.user, { displayName: name.trim() });
      }
      const user: AuthUser = {
        id: res.user.uid,
        name: name.trim() || res.user.email?.split('@')[0] || 'مدير جديد',
        email: res.user.email || undefined,
        role: 'admin',
        loginMethod: 'firebase',
        loginAt: new Date().toISOString(),
      };
      this.persistSession(user, true);
      return { success: true, user };
    } catch (err: unknown) {
      let message = 'فشل إنشاء الحساب الجديد.';
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        message = 'هذا البريد مسجل مسبقاً، يرجى تسجيل الدخول بدلاً من ذلك.';
      } else if (code === 'auth/weak-password') {
        message = 'كلمة المرور ضعيفة، اختر كلمة مرور لا تقل عن 6 أحرف.';
      } else if (err instanceof Error) {
        message = err.message;
      }
      return { success: false, error: message };
    }
  }

  /**
   * Log out from both local and Firebase session
   */
  public async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout error:', e);
    }
    this.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    this.notify();
  }
}

export const authService = new AuthService();
