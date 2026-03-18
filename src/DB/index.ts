import colors from "colors";
import { User } from "../app/modules/user/user.model";
import config from "../config";
import { USER_ROLES } from "../enums/user";
import { logger } from "../shared/logger";
import { IntakeFormConfig } from "../app/modules/intake-form-field/intake-form-config.model"
const superUser = {
  name: "Admin",
  role: USER_ROLES.ADMIN,
  email: config.admin.email,
  password: config.admin.password,
  verified: true,
};

const seedAdmin = async () => {
  const isExistSuperAdmin = await User.findOne({
    role: USER_ROLES.ADMIN,
  });

  if (!isExistSuperAdmin) {
    await User.create(superUser);
    logger.info(colors.green("✔ Super admin created successfully!"));
  }
};

export const seedIntakeFormConfig = async () => {
  const existing = await IntakeFormConfig.countDocuments();
  if (existing > 0) {
    logger.info(
      colors.yellow("⚠ In take form config already seeded — skipping"),
    );
    return;
  }

  // ══════════════════════════════════════════════════════════════
  // CLIENT FORM — matches clientProfile.model.ts + Postman steps
  // ══════════════════════════════════════════════════════════════
  const clientFields = [
    // ── Step 1 — Personal Info (form-data) ───────────────────────

    {
      step: 1,
      label: "Full Name",
      fieldKey: "fullName",
      fieldType: "short_text",
      isRequired: true,
      order: 0,
    },
    {
      step: 1,
      label: "Phone Number",
      fieldKey: "phone",
      fieldType: "phone",
      isRequired: false,
      order: 1,
    },
    {
      step: 1,
      label: "Date of Birth",
      fieldKey: "dateOfBirth",
      fieldType: "date",
      isRequired: false,
      order: 2,
    },
    {
      step: 1,
      label: "Gender Identity",
      fieldKey: "genderIdentity",
      fieldType: "dropdown",
      options: ["male", "female", "non_binary", "prefer_not_to_say"],
      isRequired: false,
      order: 3,
    },
    {
      step: 1,
      label: "Preferred Language",
      fieldKey: "preferredLanguage",
      fieldType: "short_text",
      isRequired: false,
      order: 4,
    },
    {
      step: 1,
      label: "Profile Photo",
      fieldKey: "profilePhoto",
      fieldType: "file",
      isRequired: false,
      order: 5,
    },

    // Emergency Contact (sent as emergencyContact[fullName] etc.)
    {
      step: 1,
      label: "Contact Full Name",
      fieldKey: "emergencyContact.fullName",
      fieldType: "short_text",
      isRequired: false,
      order: 6,
    },
    {
      step: 1,
      label: "Phone Number",
      fieldKey: "emergencyContact.phone",
      fieldType: "phone",
      isRequired: false,
      order: 7,
    },
    {
      step: 1,
      label: "Relationship",
      fieldKey: "emergencyContact.relationship",
      fieldType: "short_text",
      isRequired: false,
      order: 8,
    },

    // Billing Address (sent as billingAddress[street] etc.)
    {
      step: 1,
      label: "Street Address",
      fieldKey: "billingAddress.street",
      fieldType: "short_text",
      isRequired: false,
      order: 9,
    },
    {
      step: 1,
      label: "City",
      fieldKey: "billingAddress.city",
      fieldType: "short_text",
      isRequired: false,
      order: 10,
    },
    {
      step: 1,
      label: "Zip Code",
      fieldKey: "billingAddress.zipCode",
      fieldType: "short_text",
      isRequired: false,
      order: 11,
    },
    {
      step: 1,
      label: "Country",
      fieldKey: "billingAddress.country",
      fieldType: "short_text",
      isRequired: false,
      order: 12,
    },
        {
      step: 1,
      label: "Email",
      fieldKey: "email",
      fieldType: "email",
      isRequired: false,
      order: 13,
    },

    // ── Step 2 — Therapy Preference (JSON body) ───────────────────
    // Postman: therapyPreference: { therapistGender, therapyType,
    //          sessionFormat, sessionFrequency, preferredApproach }
    {
      step: 2,
      label: "Therapist Gender",
      fieldKey: "therapyPreference.therapistGender",
      fieldType: "dropdown",
      options: ["male", "female", "other", "no_preference"],
      isRequired: false,
      order: 0,
    },
    {
      step: 2,
      label: "Therapy Type",
      fieldKey: "therapyPreference.therapyType",
      fieldType: "dropdown",
      options: ["individual", "couple", "family", "group"],
      isRequired: false,
      order: 1,
    },
    {
      step: 2,
      label: "Session Format",
      fieldKey: "therapyPreference.sessionFormat",
      fieldType: "dropdown",
      options: ["online", "in_person"],
      isRequired: false,
      order: 2,
    },
    {
      step: 2,
      label: "Session Frequency",
      fieldKey: "therapyPreference.sessionFrequency",
      fieldType: "dropdown",
      options: ["weekly", "bi_weekly", "monthly"],
      isRequired: false,
      order: 3,
    },
    {
      step: 2,
      label: "Preferred Approach",
      fieldKey: "therapyPreference.preferredApproach",
      fieldType: "dropdown",
      options: ["No Preference", "Let therapist decide"],
      isRequired: false,
      order: 4,
    },

    // ── Step 3 — Insurance (form-data) ────────────────────────────
    // Postman: insurance[provider], insurance[memberId],
    //          insurance[groupNumber], paymentMethod,
    //          insuranceCardFront (file), insuranceCardBack (file)
    {
      step: 3,
      label: "Insurance Provider",
      fieldKey: "insurance.provider",
      fieldType: "short_text",
      isRequired: false,
      order: 0,
    },
    {
      step: 3,
      label: "Member ID",
      fieldKey: "insurance.memberId",
      fieldType: "short_text",
      isRequired: false,
      order: 1,
    },
    {
      step: 3,
      label: "Group Number",
      fieldKey: "insurance.groupNumber",
      fieldType: "short_text",
      isRequired: false,
      order: 2,
    },
    {
      step: 3,
      label: "Insurance Card Front",
      fieldKey: "insurance.cardPhotoFront",
      fieldType: "file",
      isRequired: false,
      order: 3,
    },
    {
      step: 3,
      label: "Insurance Card Back",
      fieldKey: "insurance.cardPhotoBack",
      fieldType: "file",
      isRequired: false,
      order: 4,
    },
    {
      step: 3,
      label: "Payment",
      fieldKey: "paymentMethod",
      fieldType: "dropdown",
      options: ["credit_card"],
      isRequired: false,
      order: 5,
    },

    // ── Step 4 — Medical History (JSON body) ──────────────────────
    // Postman: medicalHistory: { primaryPhysicianName, physicianPhone,
    //          currentMedications, previousDiagnoses, pastTherapyExperience }
    {
      step: 4,
      label: "Primary Physician Name",
      fieldKey: "medicalHistory.primaryPhysicianName",
      fieldType: "short_text",
      isRequired: false,
      order: 0,
    },
    {
      step: 4,
      label: "Physician Phone Number",
      fieldKey: "medicalHistory.physicianPhone",
      fieldType: "phone",
      isRequired: false,
      order: 1,
    },
    {
      step: 4,
      label: "Current Medications",
      fieldKey: "medicalHistory.currentMedications",
      fieldType: "long_text",
      isRequired: false,
      order: 2,
    },
    {
      step: 4,
      label: "Previous Mental Health Diagnoses",
      fieldKey: "medicalHistory.previousDiagnoses",
      fieldType: "long_text",
      isRequired: false,
      order: 3,
    },
    {
      step: 4,
      label: "Past Therapy Experience",
      fieldKey: "medicalHistory.pastTherapyExperience",
      fieldType: "long_text",
      isRequired: false,
      order: 4,
    },

    // ── Step 5 — Goals (JSON body) ────────────────────────────────
    // Postman: reasonForTherapy, primaryGoal
    {
      step: 5,
      label: "Reason for Therapy",
      fieldKey: "reasonForTherapy",
      fieldType: "long_text",
      isRequired: false,
      order: 0,
    },
    {
      step: 5,
      label: "Primary Goal",
      fieldKey: "primaryGoal",
      fieldType: "long_text",
      isRequired: false,
      order: 1,
    },
  ];

  await IntakeFormConfig.insertMany(
    clientFields.map((f) => ({
      ...f,
      formType: "CLIENT",
      isCore: true,
      isActive: true,
    })),
  );

  // ══════════════════════════════════════════════════════════════
  // PROVIDER FORM — matches providerProfile.model.ts + Postman steps
  // ══════════════════════════════════════════════════════════════
  const providerFields = [
    // ── Step 1 — Personal Info (form-data) ───────────────────────
    // Postman: fullName, phone, dateOfBirth, genderIdentity,
    //          licenseNumber, providerType, officeAddress, city,
    //          licenseState, professionalPhoto (file), professionalVideo (file)
    {
      step: 1,
      label: "Full Name",
      fieldKey: "fullName",
      fieldType: "short_text",
      isRequired: true,
      order: 0,
    },
    {
      step: 1,
      label: "License Number",
      fieldKey: "licenseNumber",
      fieldType: "short_text",
      isRequired: true,
      order: 2,
    },
    {
      step: 1,
      label: "State/Province of Licence",
      fieldKey: "licenseState",
      fieldType: "short_text",
      isRequired: false,
      order: 3,
    },
        {
      step: 1,
      label: "Provider Type",
      fieldKey: "providerType",
      fieldType: "dropdown",
      options: [
        "clinical_psychologist",
        "licensed_counselor",
        "social_worker",
        "psychiatrist",
        "other",
      ],
      isRequired: true,
      order: 4,
    },
    {
      step: 1,
      label: "Phone",
      fieldKey: "phone",
      fieldType: "phone",
      isRequired: false,
      order: 5,
    },
    
    {
      step: 1,
      label: "Email",
      fieldKey: "Email",
      fieldType: "email",
      isRequired: false,
      order: 6,
    },
    {
      step: 1,
      label: "Office Address",
      fieldKey: "officeAddress",
      fieldType: "short_text",
      isRequired: false,
      order: 7,
    },
    {
      step: 1,
      label: "City",
      fieldKey: "city",
      fieldType: "short_text",
      isRequired: false,
      order: 8,
    },

    {
      step: 1,
      label: "Profile Photo",
      fieldKey: "profilePhoto",
      fieldType: "file",
      isRequired: false,
      order: 9,
    },
    {
      step: 1,
      label: "Professional Photo",
      fieldKey: "professionalPhoto",
      fieldType: "file",
      isRequired: false,
      order: 10,
    },
    {
      step: 1,
      label: "Professional Video",
      fieldKey: "professionalVideo",
      fieldType: "file",
      isRequired: false,
      order: 11,
    },

    // ── Step 2 — Credentials (form-data) ─────────────────────────
    // Postman: education (JSON array), affiliations,
    //          additionalCertifications, employment (JSON array),
    //          cvDocument (file), licenseDocument (file)
    {
      step: 2,
      label: "Degree Name",
      fieldKey: "education.degreeName",
      fieldType: "short_text",
      isRequired: false,
      order: 0,
    },
    {
      step: 2,
      label: "University Name",
      fieldKey: "education.university",
      fieldType: "short_text",
      isRequired: false,
      order: 1,
    },
    {
      step: 2,
      label: "Graduation Year",
      fieldKey: "education.graduationYear",
      fieldType: "number",
      isRequired: false,
      order: 2,
    },
    {
      step: 2,
      label: "Professinal Affiliations",
      fieldKey: "affiliations",
      fieldType: "long_text",
      isRequired: false,
      order: 3,
    },
    {
      step: 2,
      label: "Additional Certifications",
      fieldKey: "additionalCertifications",
      fieldType: "long_text",
      isRequired: false,
      order: 4,
    },
    {
      step: 2,
      label: "Employer Name",
      fieldKey: "employment.employerName",
      fieldType: "short_text",
      isRequired: false,
      order: 5,
    },
    {
      step: 2,
      label: "Job Title",
      fieldKey: "employment.jobTitle",
      fieldType: "short_text",
      isRequired: false,
      order: 6,
    },
    {
      step: 2,
      label: "Employment Start Date",
      fieldKey: "employment.startDate",
      fieldType: "date",
      isRequired: false,
      order: 7,
    },
    {
      step: 2,
      label: "Employment End Date",
      fieldKey: "employment.endDate",
      fieldType: "date",
      isRequired: false,
      order: 8,
    },
    {
      step: 2,
      label: "Responsibilities",
      fieldKey: "employment.responsibilities",
      fieldType: "long_text",
      isRequired: false,
      order: 9,
    },

    {
      step: 2,
      label: "CV Document",
      fieldKey: "cvDocument",
      fieldType: "file",
      isRequired: false,
      order: 11,
    },
    {
      step: 2,
      label: "License Document",
      fieldKey: "licenseDocument",
      fieldType: "file",
      isRequired: false,
      order: 12,
    },

    // ── Step 3 — Practice Info (form-data) ────────────────────────
    // Postman: therapeuticApproaches (array), clientPopulations (array),
    //          sessionFormats (array)
    // Note: sessionLengths + sessionFees managed via SessionType module
    {
      step: 3,
      label: "Therapeutic Approaches",
      fieldKey: "therapeuticApproaches",
      fieldType: "checkbox",
      options: [
        "CBT",
        "DBT",
        "EMDR",
        "Psychodynamic",
        "Mindfulness-Based",
        "Humanistic",
        "ACT",
        "Gottman Method",
        "Solution-Focused",
        "Other",
      ],
      isRequired: true,
      order: 0,
    },
    {
      step: 3,
      label: "Client Populations",
      fieldKey: "clientPopulations",
      fieldType: "checkbox",
      options: [
        "Adults",
        "Children",
        "Adolescents",
        "Couples",
        "Families",
        "Seniors",
        "LGBTQ+",
        "Veterans",
        "First Responders",
        "Other",
      ],
      isRequired: true,
      order: 1,
    },
    {
      step: 3,
      label: "Session Formats",
      fieldKey: "sessionFormats",
      fieldType: "checkbox",
      options: ["online", "in_person"],
      isRequired: true,
      order: 2,
    },
  ];

  await IntakeFormConfig.insertMany(
    providerFields.map((f) => ({
      ...f,
      formType: "PROVIDER",
      isCore: true,
      isActive: true,
    })),
  );

  logger.info(colors.green("✅ Intake form config seeded successfully!"));
};

export default seedAdmin;
