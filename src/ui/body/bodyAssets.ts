/** Illustrations anatomiques — style infographie musculaire (sans labels) */
export const BODY_IMAGES = {
  homme: {
    front: require('../../../assets/body/body-male-front.png'),
    back: require('../../../assets/body/body-male-back.png'),
  },
  femme: {
    front: require('../../../assets/body/body-female-front.png'),
    back: require('../../../assets/body/body-female-back.png'),
  },
} as const;

export type BodyGender = keyof typeof BODY_IMAGES;
