import path from 'path';
import fs from 'fs';
import axios from 'axios';
import Replicate from 'replicate';
import { MEDIA_ASSET_UID } from '../constants';
import type { Strapi } from '../types';

const mediaGenerator = ({ strapi }: { strapi: Strapi }) => {
  return {
    async generateAndUpload(input: {
      prompt: string;
      label: string;
      purpose: string;
      signSlug?: string;
      workflowId?: number;
      model?: string;
      apiToken?: string;
    }): Promise<{ mediaAssetId: number; uploadFileId: number }> {
      const replicate = new Replicate({
        auth: input.apiToken || process.env.REPLICATE_API_TOKEN,
      });

      strapi.log.info(`[aico] Autonomiczna generacja obrazu: ${input.label}`);

      // 1. Generowanie w Replicate
      const modelId = input.model || 'openai/gpt-image-2';

      const output = await replicate.run(modelId as Parameters<Replicate['run']>[0], {
        input: {
          prompt: input.prompt,
          aspect_ratio: '2:3',
          output_format: 'webp',
          output_quality: 90,
        },
      });

      const imageUrl = String(Array.isArray(output) ? output[0] : output);

      // 2. Pobieranie obrazu do bufora
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');

      // 3. Strategia Temp File dla Strapi 5
      const publicDir = path.join(process.cwd(), 'public');
      const tmpDir = path.join(publicDir, 'uploads', 'tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const filename = `auto_${Date.now()}.webp`;
      const tmpPath = path.join(tmpDir, filename);
      fs.writeFileSync(tmpPath, buffer);

      try {
        const uploadService = strapi.plugin('upload').service('upload');

        // 4. Upload do Strapi (R2)
        const uploadedFiles = await uploadService.upload({
          data: {
            fileInfo: {
              alternativeText: input.label,
              caption: input.label,
              name: filename,
            },
          },
          files: {
            filepath: tmpPath,
            originalFilename: filename,
            name: filename,
            type: 'image/webp',
            size: buffer.length,
          },
        });

        const fileId = uploadedFiles[0].id;

        // 5. Rejestracja w katalogu mediów AICO
        const assetKey = `auto_${input.signSlug || 'gen'}_${Date.now()}`;
        const mediaAsset = await strapi.entityService.create(MEDIA_ASSET_UID, {
          data: {
            asset_key: assetKey,
            label: input.label,
            purpose: input.purpose,
            sign_slug: input.signSlug || null,
            active: true,
            asset: fileId,
            mapping_confidence: 0.9,
            mapping_source: 'autonomous_agent',
            last_used_at: new Date(),
            use_count: 1,
            keywords: [],
          } as never,
        });

        return {
          mediaAssetId: (mediaAsset as { id: number }).id,
          uploadFileId: fileId,
        };
      } finally {
        // Cleanup temp file
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      }
    },
  };
};

export default mediaGenerator;
