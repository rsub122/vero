import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Vero",
  version: packageJson.version,
  copyright: `© ${currentYear}, Vero.`,
  meta: {
    title: "Vero: verified applicant pre-check",
    description:
      "A 2-minute pre-check that verifies a construction applicant's answers and safety card before a recruiter calls.",
  },
};
