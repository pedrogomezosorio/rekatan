import { CUSTOM_AVATAR_CELTA, CUSTOM_AVATAR_PONTEVEDRA, DEPOR_AVATAR, PONFE_AVATAR } from './constants';

const AVATAR_PREFIXES: Record<string, string> = {
  [DEPOR_AVATAR]: 'candal/',
  [CUSTOM_AVATAR_CELTA]: 'sixo/',
  [CUSTOM_AVATAR_PONTEVEDRA]: 'sixo/',
  [PONFE_AVATAR]: 'apagalaradio/',
  // Also validate avatars retained by older browser sessions.
  '/assets/avatars/depor.jpg': 'candal/',
  '/assets/avatars/celta.jpg': 'sixo/',
};

export function getPublicPlayerName(name: string): string {
  return name.trim().replace(/^(candal|sixo|apagalaradio)\//i, '').trim().slice(0, 20);
}

export function getAvatarNameError(avatar: string, name: string): string | null {
  const prefix = AVATAR_PREFIXES[avatar];
  if (prefix && (!name.trim().toLowerCase().startsWith(prefix) || !getPublicPlayerName(name))) {
    return 'te falta flow';
  }
  return null;
}

export function normalizeAvatar(avatar: string): string {
  if (avatar === '/assets/avatars/depor.jpg') return DEPOR_AVATAR;
  if (avatar === '/assets/avatars/celta.jpg') return CUSTOM_AVATAR_CELTA;
  return avatar;
}
