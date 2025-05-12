import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

   export async function POST(request: Request) {
     try {
       const { prompt, imageCount } = await request.json();

       if (!prompt || !imageCount || imageCount < 1 || imageCount > 4) {
         return NextResponse.json({ error: 'Invalid prompt or image count' }, { status: 400 });
       }

       const apiKey = process.env.STABILITY_API_KEY;
       if (!apiKey) {
         throw new Error('STABILITY_API_KEY is not configured');
       }

       const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${apiKey}`,
           Accept: 'application/json',
         },
         body: JSON.stringify({
           text_prompts: [{ text: prompt }],
           cfg_scale: 7,
           height: 576, // 16:9 aspect ratio (1024x576)
           width: 1024,
           samples: imageCount,
           steps: 30,
         }),
       });

       if (!response.ok) {
         const errorData = await response.json();
         logger.error('Stability AI API error', errorData);
         throw new Error(`Stability AI API error: ${errorData.message || response.statusText}`);
       }

       const data = await response.json();
       const images = data.artifacts.map((artifact: { base64: string }) => artifact.base64);

       return NextResponse.json({ images });
     } catch (error) {
       logger.error('Error generating images', error);
       return NextResponse.json({ error: 'Failed to generate images' }, { status: 500 });
     }
   }

// import { NextResponse } from 'next/server';

//   export async function POST(request: Request) {
//     try {
//       const { prompt, imageCount } = await request.json();

//       if (!prompt || !imageCount || imageCount < 1 || imageCount > 4) {
//         return NextResponse.json({ error: 'Invalid prompt or image count' }, { status: 400 });
//       }

//       const apiKey = process.env.OPENAI_API_KEY;
//       if (!apiKey) {
//         throw new Error('OPENAI_API_KEY is not configured');
//       }

//       const response = await fetch('https://api.openai.com/v1/images/generations', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${apiKey}`,
//         },
//         body: JSON.stringify({
//           model: 'dall-e-3',
//           prompt,
//           n: imageCount,
//           size: '1792x1024', // Closest to 16:9
//           response_format: 'b64_json',
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(`OpenAI API error: ${errorData.error.message || response.statusText}`);
//       }

//       const data = await response.json();
//       const images = data.data.map((item: { b64_json: string }) => item.b64_json);

//       return NextResponse.json({ images });
//     } catch (error) {
//       console.error('Error generating images:', error);
//       return NextResponse.json({ error: 'Failed to generate images' }, { status: 500 });
//     }
//   }