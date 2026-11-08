import { describe, expect, it } from 'vitest';
import { CUSTOM_AVATAR_CELTA, CUSTOM_AVATAR_PONTEVEDRA, DEPOR_AVATAR, PONFE_AVATAR } from '../constants';
import { getAvatarNameError, getPublicPlayerName, normalizeAvatar } from '../playerIdentity';

describe('football avatar identity', () => {
  it.each([
    [DEPOR_AVATAR, 'candal/'],
    [CUSTOM_AVATAR_CELTA, 'sixo/'],
    [CUSTOM_AVATAR_PONTEVEDRA, 'sixo/'],
    [PONFE_AVATAR, 'apagalaradio/'],
  ])('requires the correct prefix for %s and a nonempty public name', (avatar, prefix) => {
    expect(getAvatarNameError(avatar, `${prefix}joel`)).toBeNull();
    expect(getAvatarNameError(avatar, `  ${prefix.toUpperCase()}Joel  `)).toBeNull();
    for (const name of ['joel', 'mantecado de coco', prefix, `${prefix}   `, 'otro/joel']) {
      expect(getAvatarNameError(avatar, name)).toBe('te falta flow');
    }
    for (const other of ['candal/', 'sixo/', 'apagalaradio/'].filter(value => value !== prefix)) {
      expect(getAvatarNameError(avatar, `${other}joel`)).not.toBeNull();
    }
  });

  it('keeps ordinary avatars available with any name', () => {
    expect(getAvatarNameError('👑', 'joel')).toBeNull();
  });

  it('strips only the initial recognized prefix before applying the public length limit', () => {
    expect(getPublicPlayerName('candal/joel')).toBe('joel');
    expect(getPublicPlayerName(' sixo/ Joel ')).toBe('Joel');
    expect(getPublicPlayerName('apagalaradio/12345678901234567890')).toBe('12345678901234567890');
    expect(getPublicPlayerName('candal/joel/otro')).toBe('joel/otro');
    expect(getPublicPlayerName('otro/joel')).toBe('otro/joel');
    expect(getPublicPlayerName('joel')).toBe('joel');
  });

  it('migrates saved JPG avatars and applies the new restriction to them', () => {
    expect(normalizeAvatar('/assets/avatars/depor.jpg')).toBe(DEPOR_AVATAR);
    expect(normalizeAvatar('/assets/avatars/celta.jpg')).toBe(CUSTOM_AVATAR_CELTA);
    expect(getAvatarNameError('/assets/avatars/depor.jpg', 'mantecado de coco')).not.toBeNull();
  });
});
