/* ==========================================================================
   Planète Lorna — réglages du site (à modifier ici, rien d'autre à toucher)
   Site 100 % statique : aucune base de données, aucun abonnement.
   ========================================================================== */
window.SITE = {
  nom: 'Planète Lorna',

  /* Téléphone principal (celui de la fiche Google). Sur Facebook figure aussi le 09 83 82 95 11 :
     à confirmer avec Lorna avant mise en ligne. */
  tel: { affiche: '09 87 52 36 98', e164: '+33987523698' },

  /* Les numéros en 09 ne reçoivent pas de SMS. Si Lorna a un mobile, mettre ici son numéro
     (ex. '+33612345678') : un bouton « Envoyer par SMS » apparaîtra automatiquement. */
  sms: null,

  email: 'planetelorna@hotmail.com',
  adresse: { rue: "14 rue de l'Hubac", cp: '04000', ville: 'Digne-les-Bains' },
  geo: { lat: 44.0918422, lng: 6.2346281 },

  mapsUrl: 'https://www.google.com/maps/place/PLANETE+LORNA/@44.0918422,6.2346281,17z/data=!4m6!3m5!1s0x12cb9b6720f6ef8d:0x484ef2717d3f8eef!8m2!3d44.0918422!4d6.2346281!16s%2Fg%2F11q3sjc3d8',
  instagram: 'https://www.instagram.com/planete.lorna/',
  facebook: 'https://www.facebook.com/planetelorna/',
  messenger: 'https://m.me/planetelorna',
  instagramDm: 'https://ig.me/m/planete.lorna',

  /* Horaires — clés = jour JavaScript (0 = dimanche … 6 = samedi). [] = fermé. */
  horaires: {
    0: [],
    1: [],
    2: [['09:30', '12:30'], ['14:30', '18:00']],
    3: [['09:30', '12:30'], ['14:30', '18:00']],
    4: [['09:30', '12:30'], ['14:30', '18:00']],
    5: [['09:30', '12:30'], ['14:30', '18:00']],
    6: [['09:30', '12:30']]
  },
  /* Dates de fermeture exceptionnelle, format 'AAAA-MM-JJ' (ex. vacances, jours fériés) */
  fermetures: [],

  pasCreneau: 30,        // minutes entre deux créneaux proposés
  horizonJours: 60,      // on peut demander un rendez-vous jusqu'à 60 jours à l'avance
  delaiMinutes: 120,     // pas de créneau proposé dans moins de 2 h

  /* Prestations proposables à la réservation.
     prix : mettre un texte (ex. 'à partir de 35 €') quand Lorna aura communiqué ses tarifs ; null = « sur demande ».
     duree : durée indicative en minutes (sert à proposer des créneaux et au fichier agenda). */
  services: [
    { id: 'conseil',  titre: 'Conseil en lithothérapie',        duree: 30, prix: null, resume: 'Un échange pour trouver la pierre qui vous ressemble.' },
    { id: 'soin',     titre: 'Soin énergétique',                duree: 60, prix: null, resume: 'Un moment pour souffler, posé et à votre rythme.' },
    { id: 'creation', titre: 'Création sur mesure',             duree: 60, prix: null, resume: 'Bracelet ou bijou composé avec vous, pierre par pierre.' },
    { id: 'cadeau',   titre: 'Idée cadeau personnalisée',       duree: 30, prix: null, resume: 'On cherche ensemble le cadeau qui fera mouche.' },
    { id: 'piece',    titre: "Réserver une pièce d'exception",  duree: 30, prix: null, resume: 'Grande pièce ou pièce de valeur : réservation avec acompte.' },
    { id: 'avent',    titre: "Calendrier de l'Avent",           duree: 15, prix: null, resume: '24 cases, 24 surprises. Quantité très limitée.' }
  ],

  /* Calendrier de l'Avent : annoncé sur Facebook le 4 novembre 2026.
     Passer show à false (ou supprimer la section) après Noël. */
  avent: { show: true }
};
