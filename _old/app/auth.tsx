import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, FONT } from '../src/constants';
import { useAuthStore } from '../src/store/authStore';

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword, isLoading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    clearError();

    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }

    if (mode === 'forgot') {
      try {
        await resetPassword(email.trim());
        Alert.alert('Check your email', 'We sent a password reset link to your inbox.');
        setMode('signin');
      } catch {}
      return;
    }

    if (!password) {
      Alert.alert('Password required', 'Please enter a password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        Alert.alert('Weak password', 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Mismatch', "Passwords don't match.");
        return;
      }
      try {
        await signUp(email.trim(), password, displayName.trim() || undefined);
        Alert.alert('Welcome!', 'Check your email to confirm your account, then sign in.');
        setMode('signin');
      } catch {}
      return;
    }

    // Sign in
    try {
      await signIn(email.trim(), password);
    } catch {}
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>Garden Manager</Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signup' && (
            <>
              <Text style={styles.label}>Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="words"
              />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {mode !== 'forgot' && (
            <>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'signup' && (
            <>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPassword}
              />
            </>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot password link */}
          {mode === 'signin' && (
            <TouchableOpacity
              style={styles.link}
              onPress={() => { setMode('forgot'); clearError(); }}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mode toggle */}
        <View style={styles.footer}>
          {mode === 'signin' ? (
            <TouchableOpacity onPress={() => { setMode('signup'); clearError(); }}>
              <Text style={styles.footerText}>
                Don't have an account? <Text style={styles.footerLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setMode('signin'); clearError(); }}>
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.footerLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // Header
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: { fontSize: 64, marginBottom: SPACING.sm },
  title: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textLight,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT.sizes.md,
    color: '#ffffffbb',
    marginTop: SPACING.xs,
  },

  // Error
  errorBanner: {
    backgroundColor: '#C44B4B30',
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#C44B4B60',
  },
  errorText: { color: '#FFB4B4', fontSize: FONT.sizes.sm, textAlign: 'center' },

  // Form
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONT.sizes.md,
    color: COLORS.text,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1 },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  eyeText: { fontSize: 18 },

  // Submit
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: COLORS.textLight, fontSize: FONT.sizes.md, fontWeight: '700' },

  // Links
  link: { alignItems: 'center', marginTop: SPACING.md },
  linkText: { color: COLORS.primary, fontSize: FONT.sizes.sm },

  // Footer
  footer: { alignItems: 'center' },
  footerText: { color: '#ffffffbb', fontSize: FONT.sizes.md },
  footerLink: { color: COLORS.accentLight, fontWeight: '700' },
});
