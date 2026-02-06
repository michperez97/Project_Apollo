import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import {
  findProfileByUserId,
  upsertProfile,
  findPublicProfile,
  findApprovedCoursesByInstructor
} from '../models/profileModel';

export const getMyProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await findProfileByUserId(req.user.sub);

    if (!profile) {
      return res.json({
        profile: {
          user_id: req.user.sub,
          avatar_url: null,
          headline: null,
          bio: null,
          specializations: null,
          website_url: null,
          linkedin_url: null,
          email: req.user.email
        }
      });
    }

    return res.json({ profile });
  } catch (error) {
    return next(error);
  }
};

export const updateMyProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { avatar_url, headline, bio, specializations, website_url, linkedin_url } = req.body;

    const profile = await upsertProfile(req.user.sub, {
      avatar_url,
      headline,
      bio,
      specializations,
      website_url,
      linkedin_url
    });

    return res.json({ profile });
  } catch (error) {
    return next(error);
  }
};

export const getPublicProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const profile = await findPublicProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const courses = await findApprovedCoursesByInstructor(userId);

    return res.json({ profile, courses });
  } catch (error) {
    return next(error);
  }
};
