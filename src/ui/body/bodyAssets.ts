/** Illustrations anatomiques — style infographie musculaire (sans labels) */
export const BODY_IMAGES = {
  homme: {
    front: require('../../../assets/body/body-male-front.jpg'),
    back: require('../../../assets/body/body-male-back.jpg'),
  },
  femme: {
    front: require('../../../assets/body/body-female-front.jpg'),
    back: require('../../../assets/body/body-female-back.jpg'),
  },
} as const;

export type BodyGender = keyof typeof BODY_IMAGES;
