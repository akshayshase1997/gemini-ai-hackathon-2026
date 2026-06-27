export interface GcpCloudRunService {
  name: string;
  region: string;
  ingress: string;
  minInstances?: number;
  maxInstances?: number;
  uri?: string;
}

export interface GcpCloudSqlInstance {
  name: string;
  databaseVersion: string;
  tier: string;
  region: string;
  gceZone?: string;
  haEnabled: boolean;
  publicIpEnabled: boolean;
}

export interface GcpComputeInstance {
  name: string;
  zone: string;
  machineType: string;
  status: string;
  publicIp?: string;
}

export interface GcpStorageBucket {
  name: string;
  location: string;
  storageClass: string;
  lifecycleRulesCount: number;
}

export interface GcpScanResult {
  projectId: string;
  cloudRunServices: GcpCloudRunService[];
  cloudSqlInstances: GcpCloudSqlInstance[];
  computeInstances: GcpComputeInstance[];
  storageBuckets: GcpStorageBucket[];
}

/**
 * Fetch list of GCP Projects accessible by the token
 */
export async function listGcpProjects(accessToken: string): Promise<{ projectId: string; name: string }[]> {
  try {
    const response = await fetch('https://cloudresourcemanager.googleapis.com/v1/projects', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to list projects: ${response.statusText}. Details: ${errText}`);
    }

    const data = await response.json();
    if (!data.projects) return [];
    
    return data.projects.map((p: any) => ({
      projectId: p.projectId,
      name: p.name || p.projectId
    }));
  } catch (error) {
    console.error('Error fetching GCP projects:', error);
    throw error;
  }
}

/**
 * Scan active resources in a target project
 */
export async function scanProjectResources(
  projectId: string,
  accessToken: string,
  onProgress: (step: string) => void,
  selectedTypes: { run: boolean; sql: boolean; gce: boolean; gcs: boolean }
): Promise<GcpScanResult> {
  const result: GcpScanResult = {
    projectId,
    cloudRunServices: [],
    cloudSqlInstances: [],
    computeInstances: [],
    storageBuckets: []
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json'
  };

  // 1. SCAN CLOUD RUN SERVICES
  if (selectedTypes.run) {
    onProgress('Scanning Cloud Run services (all locations)...');
    try {
      // Use '-' for locations to get all regions
      const response = await fetch(`https://run.googleapis.com/v1/projects/${projectId}/locations/-/services`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          result.cloudRunServices = data.items.map((item: any) => {
            const annotations = item.metadata?.annotations || {};
            const specTemplate = item.spec?.template?.spec || {};
            const container = specTemplate.containers?.[0] || {};
            
            // Extract region from metadata.namespace/labels or selfLink
            const selfLink = item.metadata?.selfLink || '';
            const regionMatch = selfLink.match(/\/locations\/([^/]+)\//);
            const region = regionMatch ? regionMatch[1] : 'unknown';

            // Auto-scaling settings
            const minScale = annotations['autoscaling.knative.dev/minScale'];
            const maxScale = annotations['autoscaling.knative.dev/maxScale'];

            return {
              name: item.metadata?.name || 'unknown',
              region,
              ingress: annotations['run.googleapis.com/ingress'] || 'all',
              minInstances: minScale ? parseInt(minScale, 10) : 0,
              maxInstances: maxScale ? parseInt(maxScale, 10) : undefined,
              uri: item.status?.url
            };
          });
        }
        onProgress(`[✓] Cloud Run scanning complete. Found ${result.cloudRunServices.length} services.`);
      } else {
        const err = await response.json().catch(() => ({}));
        onProgress(`[!] Cloud Run API scan skipped: ${err?.error?.message || response.statusText}`);
      }
    } catch (e: any) {
      onProgress(`[!] Cloud Run scan failed: ${e.message || e}`);
    }
  }

  // 2. SCAN CLOUD SQL INSTANCES
  if (selectedTypes.sql) {
    onProgress('Scanning Cloud SQL databases...');
    try {
      const response = await fetch(`https://sqladmin.googleapis.com/v1/projects/${projectId}/instances`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          result.cloudSqlInstances = data.items.map((item: any) => {
            const ipConfigs = item.settings?.ipConfiguration || {};
            const hasPublicIp = !!ipConfigs.ipv4Enabled;
            
            return {
              name: item.name || 'unknown',
              databaseVersion: item.databaseVersion || 'unknown',
              tier: item.settings?.tier || 'unknown',
              region: item.region || 'unknown',
              gceZone: item.gceZone,
              haEnabled: item.settings?.availabilityType === 'REGIONAL',
              publicIpEnabled: hasPublicIp
            };
          });
        }
        onProgress(`[✓] Cloud SQL scanning complete. Found ${result.cloudSqlInstances.length} instances.`);
      } else {
        const err = await response.json().catch(() => ({}));
        onProgress(`[!] Cloud SQL API scan skipped: ${err?.error?.message || response.statusText}`);
      }
    } catch (e: any) {
      onProgress(`[!] Cloud SQL scan failed: ${e.message || e}`);
    }
  }

  // 3. SCAN COMPUTE ENGINE VM INSTANCES
  if (selectedTypes.gce) {
    onProgress('Scanning Compute Engine VM instances...');
    try {
      // Use '-' for zones to query all VM zones in parallel
      const response = await fetch(`https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/-/instances`, { headers });
      if (response.ok) {
        const data = await response.json();
        const itemsMap = data.items || {};
        const instancesList: any[] = [];
        
        Object.keys(itemsMap).forEach((zoneKey) => {
          const zoneData = itemsMap[zoneKey];
          if (zoneData && zoneData.instances) {
            zoneData.instances.forEach((inst: any) => {
              // Extract simple zone name (e.g., "us-central1-a")
              const zoneUrl = inst.zone || '';
              const zone = zoneUrl.substring(zoneUrl.lastIndexOf('/') + 1);

              // Extract machine type name (e.g., "e2-medium")
              const mtUrl = inst.machineType || '';
              const machineType = mtUrl.substring(mtUrl.lastIndexOf('/') + 1);

              // Network Interfaces for Public IP
              const networkInterfaces = inst.networkInterfaces || [];
              const firstInterface = networkInterfaces[0] || {};
              const accessConfigs = firstInterface.accessConfigs || [];
              const publicIp = accessConfigs[0]?.natIP;

              instancesList.push({
                name: inst.name,
                zone,
                machineType,
                status: inst.status,
                publicIp
              });
            });
          }
        });

        result.computeInstances = instancesList;
        onProgress(`[✓] Compute Engine scanning complete. Found ${result.computeInstances.length} instances.`);
      } else {
        const err = await response.json().catch(() => ({}));
        onProgress(`[!] Compute Engine API scan skipped: ${err?.error?.message || response.statusText}`);
      }
    } catch (e: any) {
      onProgress(`[!] Compute Engine scan failed: ${e.message || e}`);
    }
  }

  // 4. SCAN CLOUD STORAGE BUCKETS
  if (selectedTypes.gcs) {
    onProgress('Scanning Cloud Storage buckets...');
    try {
      const response = await fetch(`https://storage.googleapis.com/storage/v1/b?project=${projectId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          result.storageBuckets = data.items.map((item: any) => {
            const lifecycleRules = item.lifecycle?.rule || [];
            return {
              name: item.name || 'unknown',
              location: item.location || 'unknown',
              storageClass: item.storageClass || 'STANDARD',
              lifecycleRulesCount: lifecycleRules.length
            };
          });
        }
        onProgress(`[✓] Cloud Storage scanning complete. Found ${result.storageBuckets.length} buckets.`);
      } else {
        const err = await response.json().catch(() => ({}));
        onProgress(`[!] Cloud Storage API scan skipped: ${err?.error?.message || response.statusText}`);
      }
    } catch (e: any) {
      onProgress(`[!] Cloud Storage scan failed: ${e.message || e}`);
    }
  }

  return result;
}

/**
 * Format GcpScanResult into a clean markdown/YAML architecture definition
 */
export function formatScanResultToMarkdown(scan: GcpScanResult): string {
  let content = `# GCP LIVE ENVIRONMENT SCAN ARCHITECTURE REPORT
Project Scanned: ${scan.projectId}
Scan Timestamp: ${new Date().toLocaleString()}

## Running Google Cloud Architecture Specification

`;

  if (scan.cloudRunServices.length > 0) {
    content += `### Cloud Run Services (Compute Layer)
We have ${scan.cloudRunServices.length} active Cloud Run services:
`;
    scan.cloudRunServices.forEach((s) => {
      content += `- Service Name: "${s.name}"
  - Region: ${s.region}
  - Ingress Policy: ${s.ingress}
  - Autoscale: min=${s.minInstances ?? 0}, max=${s.maxInstances ?? 'unlimited'}
  - Public Endpoint URL: ${s.uri || 'none/private'}
`;
    });
    content += `\n`;
  }

  if (scan.cloudSqlInstances.length > 0) {
    content += `### Cloud SQL Databases (State Layer)
We have ${scan.cloudSqlInstances.length} database instances:
`;
    scan.cloudSqlInstances.forEach((d) => {
      content += `- Database Name: "${d.name}"
  - Database Version: ${d.databaseVersion}
  - Machine Tier: ${d.tier}
  - Region: ${d.region} (Zone: ${d.gceZone || 'automatic'})
  - High Availability (HA): ${d.haEnabled ? 'ENABLED (Regional Multi-Zone)' : 'DISABLED (Single-Zone)'}
  - Network Ingress: ${d.publicIpEnabled ? 'PUBLIC IP ENABLED (Protected by auth network configurations)' : 'PRIVATE IP ONLY (Internal VPC access)'}
`;
    });
    content += `\n`;
  }

  if (scan.computeInstances.length > 0) {
    content += `### Compute Engine (Virtual Machines)
We have ${scan.computeInstances.length} running VM instances:
`;
    scan.computeInstances.forEach((i) => {
      content += `- VM Instance Name: "${i.name}"
  - Zone: ${i.zone}
  - Machine Type: ${i.machineType}
  - Running Status: ${i.status}
  - Network Ingress: ${i.publicIp ? `PUBLIC IP ASSIGNED (${i.publicIp})` : 'PRIVATE NETWORK INTERFACE ONLY (No external public IP)'}
`;
    });
    content += `\n`;
  }

  if (scan.storageBuckets.length > 0) {
    content += `### Cloud Storage (Object Store Layer)
We have ${scan.storageBuckets.length} object storage buckets:
`;
    scan.storageBuckets.forEach((b) => {
      content += `- Bucket Name: "${b.name}"
  - Location/Region: ${b.location}
  - Default Storage Class: ${b.storageClass}
  - Lifecycle Rules Configured: ${b.lifecycleRulesCount > 0 ? `Yes (${b.lifecycleRulesCount} rules active)` : 'No (Data grows indefinitely)'}
`;
    });
    content += `\n`;
  }

  if (
    scan.cloudRunServices.length === 0 &&
    scan.cloudSqlInstances.length === 0 &&
    scan.computeInstances.length === 0 &&
    scan.storageBuckets.length === 0
  ) {
    content += `No active Cloud Run, Cloud SQL, Compute Engine, or Cloud Storage resources were detected in the project "${scan.projectId}". Ensure the API services are enabled and permissions are granted on the connection.`;
  }

  return content;
}
