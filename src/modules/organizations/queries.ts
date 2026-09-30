import "server-only";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { logoPublicUrl } from "@/modules/organizations/logo";
import { logoDimensionsFromPath } from "@/modules/organizations/logo-box";
export async function getOrganizationSettings(organizationId:string){const[organization]=await getDatabase().select({name:organizations.name,phone:organizations.phone,defaultTaxRate:organizations.defaultTaxRate,offerValidityDays:organizations.offerValidityDays,clientNudgeAfterDays:organizations.clientNudgeAfterDays,clientExpiryWarningDays:organizations.clientExpiryWarningDays,clientScheduleDigestEnabled:organizations.clientScheduleDigestEnabled,logoStoragePath:organizations.logoStoragePath,logoSize:organizations.logoSize}).from(organizations).where(eq(organizations.id,organizationId)).limit(1);return organization?{...organization,logoUrl:logoPublicUrl(organization.logoStoragePath),logoDimensions:logoDimensionsFromPath(organization.logoStoragePath)}:null;}
