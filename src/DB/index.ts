import colors from "colors";
import { User } from "../app/modules/user/user.model";
import config from "../config";
import { USER_ROLES } from "../enums/user";
import { logger } from "../shared/logger";

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




import { IntakeFormConfig } from '../../src/app/modules/intake-form-field/intake-form-config.model';

export const seedIntakeFormConfig = async () => {
  const existing = await IntakeFormConfig.countDocuments();
  if (existing > 0) return; // already seeded

  // ════════════════════════════════════════════════════
  // CLIENT FORM — matches clientProfile.model.ts exactly
  // ════════════════════════════════════════════════════
  const clientFields = [
    // Step 1 — Personal Info
    { step:1, label:'Full Name',           fieldKey:'fullName',                       fieldType:'short_text', isRequired:true,  order:0  },
    { step:1, label:'Email',               fieldKey:'email',                          fieldType:'email',      isRequired:true,  order:1  },
    { step:1, label:'Phone',               fieldKey:'phone',                          fieldType:'phone',      isRequired:false, order:2  },
    { step:1, label:'Date of Birth',       fieldKey:'dateOfBirth',                    fieldType:'date',       isRequired:false, order:3  },
    { step:1, label:'Gender Identity',     fieldKey:'genderIdentity',                 fieldType:'dropdown',
      options:['male','female','non_binary','prefer_not_to_say'],                                              isRequired:false, order:4  },
    { step:1, label:'Preferred Language',  fieldKey:'preferredLanguage',              fieldType:'short_text', isRequired:false, order:5  },
    { step:1, label:'Emergency Contact — Full Name',     fieldKey:'emergencyContact.fullName',     fieldType:'short_text', isRequired:false, order:6 },
    { step:1, label:'Emergency Contact — Phone',         fieldKey:'emergencyContact.phone',        fieldType:'phone',      isRequired:false, order:7 },
    { step:1, label:'Emergency Contact — Relationship',  fieldKey:'emergencyContact.relationship', fieldType:'short_text', isRequired:false, order:8 },
    { step:1, label:'Billing — Street',    fieldKey:'billingAddress.street',          fieldType:'short_text', isRequired:false, order:9  },
    { step:1, label:'Billing — City',      fieldKey:'billingAddress.city',            fieldType:'short_text', isRequired:false, order:10 },
    { step:1, label:'Billing — Zip Code',  fieldKey:'billingAddress.zipCode',         fieldType:'short_text', isRequired:false, order:11 },
    { step:1, label:'Billing — Country',   fieldKey:'billingAddress.country',         fieldType:'short_text', isRequired:false, order:12 },

    // Step 2 — Therapy Preference
    { step:2, label:'Therapist Gender Preference', fieldKey:'therapyPreference.therapistGender',
      fieldType:'dropdown', options:['male','female','other','no_preference'],                     isRequired:false, order:0 },
    { step:2, label:'Therapy Type',        fieldKey:'therapyPreference.therapyType',
      fieldType:'dropdown', options:['individual','couple','family','group'],                      isRequired:false, order:1 },
    { step:2, label:'Session Format',      fieldKey:'therapyPreference.sessionFormat',
      fieldType:'dropdown', options:['online','in_person'],                                        isRequired:false, order:2 },
    { step:2, label:'Session Frequency',   fieldKey:'therapyPreference.sessionFrequency',
      fieldType:'dropdown', options:['weekly','bi_weekly','monthly'],                              isRequired:false, order:3 },
    { step:2, label:'Preferred Approach',  fieldKey:'therapyPreference.preferredApproach',        fieldType:'long_text', isRequired:false, order:4 },

    // Step 3 — Insurance
    { step:3, label:'Insurance Provider',  fieldKey:'insurance.provider',             fieldType:'short_text', isRequired:false, order:0 },
    { step:3, label:'Insurance Member ID', fieldKey:'insurance.memberId',             fieldType:'short_text', isRequired:false, order:1 },
    { step:3, label:'Insurance Group No.', fieldKey:'insurance.groupNumber',          fieldType:'short_text', isRequired:false, order:2 },
    { step:3, label:'Insurance Card Front',fieldKey:'insurance.cardPhotoFront',       fieldType:'file',       isRequired:false, order:3 },
    { step:3, label:'Insurance Card Back', fieldKey:'insurance.cardPhotoBack',        fieldType:'file',       isRequired:false, order:4 },

    // Step 4 — Medical History
    { step:4, label:'Primary Physician Name',   fieldKey:'medicalHistory.primaryPhysicianName',  fieldType:'short_text', isRequired:false, order:0 },
    { step:4, label:'Physician Phone',           fieldKey:'medicalHistory.physicianPhone',        fieldType:'phone',      isRequired:false, order:1 },
    { step:4, label:'Current Medications',       fieldKey:'medicalHistory.currentMedications',    fieldType:'long_text',  isRequired:false, order:2 },
    { step:4, label:'Previous Diagnoses',        fieldKey:'medicalHistory.previousDiagnoses',     fieldType:'long_text',  isRequired:false, order:3 },
    { step:4, label:'Past Therapy Experience',   fieldKey:'medicalHistory.pastTherapyExperience', fieldType:'long_text',  isRequired:false, order:4 },

    // Step 5 — Goals
    { step:5, label:'Reason for Therapy', fieldKey:'reasonForTherapy', fieldType:'long_text',  isRequired:false, order:0 },
    { step:5, label:'Primary Goal',       fieldKey:'primaryGoal',      fieldType:'long_text',  isRequired:false, order:1 },
  ];

  await IntakeFormConfig.insertMany(
    clientFields.map(f => ({ ...f, formType: 'CLIENT', isCore: true, isActive: true }))
  );

  // ════════════════════════════════════════════════════
  // PROVIDER FORM — matches providerProfile.model.ts
  // ════════════════════════════════════════════════════
  const providerFields = [
    // Step 1 — Personal Info
    { step:1, label:'Full Name',          fieldKey:'fullName',          fieldType:'short_text', isRequired:true,  order:0 },
    { step:1, label:'Email',              fieldKey:'email',             fieldType:'email',      isRequired:true,  order:1 },
    { step:1, label:'Phone',              fieldKey:'phone',             fieldType:'phone',      isRequired:false, order:2 },
    { step:1, label:'Date of Birth',      fieldKey:'dateOfBirth',       fieldType:'date',       isRequired:false, order:3 },
    { step:1, label:'Gender Identity',    fieldKey:'genderIdentity',    fieldType:'dropdown',
      options:['male','female','non_binary','prefer_not_to_say'],                                isRequired:false, order:4 },
    { step:1, label:'License Number',     fieldKey:'licenseNumber',     fieldType:'short_text', isRequired:true,  order:5 },
    { step:1, label:'License State',      fieldKey:'licenseState',      fieldType:'short_text', isRequired:false, order:6 },
    { step:1, label:'Provider Type',      fieldKey:'providerType',      fieldType:'dropdown',
      options:['clinical_psychologist','licensed_counselor','social_worker','psychiatrist','other'],
                                                                                                isRequired:true,  order:7 },
    { step:1, label:'Office Address',     fieldKey:'officeAddress',     fieldType:'short_text', isRequired:false, order:8 },
    { step:1, label:'City',               fieldKey:'city',              fieldType:'short_text', isRequired:false, order:9 },

    // Step 2 — Credentials
    { step:2, label:'Affiliations',             fieldKey:'affiliations',             fieldType:'long_text',  isRequired:false, order:0 },
    { step:2, label:'Additional Certifications',fieldKey:'additionalCertifications', fieldType:'long_text',  isRequired:false, order:1 },
    { step:2, label:'CV Document',              fieldKey:'cvDocument',               fieldType:'file',       isRequired:false, order:2 },
    { step:2, label:'License Document',         fieldKey:'licenseDocument',          fieldType:'file',       isRequired:false, order:3 },

    // Step 3 — Practice Info
    { step:3, label:'Therapeutic Approaches',   fieldKey:'therapeuticApproaches',    fieldType:'short_text', isRequired:false, order:0 },
    { step:3, label:'Client Populations',       fieldKey:'clientPopulations',        fieldType:'short_text', isRequired:false, order:1 },
  ];

  await IntakeFormConfig.insertMany(
    providerFields.map(f => ({ ...f, formType: 'PROVIDER', isCore: true, isActive: true }))
  );

  console.log('✅ Intake form config seeded');
};







export default seedAdmin;
