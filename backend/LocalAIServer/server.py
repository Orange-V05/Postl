from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import torch
import re
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ─── Device & Precision Optimization ──────────────────────────────────────────
device = 0 if torch.cuda.is_available() else -1
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

logger.info(f"[LocalAI] Initializing engine on {'GPU' if device == 0 else 'CPU'} with {torch_dtype}...")

try:
    generator = pipeline(
        "text-generation", 
        model="gpt2-large", 
        device=device,
        torch_dtype=torch_dtype
    )
    
    # ─── Model Warmup ───────────────────────────────────────────────────────────
    logger.info("[LocalAI] Orchestrating warmup sequence...")
    with torch.inference_mode():
        generator("Warmup", max_new_tokens=5, do_sample=False)
    logger.info("[LocalAI] Neural Engine ready and warmed up.")
    
except Exception as e:
    logger.error(f"[LocalAI] Fatal Initialization Error: {e}")
    generator = None

@app.route('/generate-post', methods=['POST'])
def generate_post():
    if generator is None:
        return jsonify({'error': 'Neural Engine offline. Please check GPU/VRAM.'}), 503

    data = request.get_json()
    prompt = data.get('prompt', '')
    topic = data.get('topic', 'general')
    platform = data.get('platform', 'twitter')
    content_type = data.get('contentType', 'single')
    tone = data.get('tone', 'professional')
    creativity = data.get('creativity', 0.7)

    if not prompt:
        return jsonify({'error': 'Insight prompt is required.'}), 400

    # Dynamic Temperature Mapping
    # Standard GPT-2 temperature works well between 0.7 and 1.2
    dyn_temperature = max(0.4, min(1.5, 0.7 + (float(creativity) * 0.6)))

    # Structure dynamic instruction
    instruction = f"Instruction: Craft a {tone} {content_type} optimized for {platform} on the topic of {topic}."
    
    # Adaptive few-shot examples
    examples = {
        'single': f"Input: The future of AI.\nOutput: AI isn't coming — it's already here. The creators who adapt now will own the next decade. Stop scrolling. Start building. IMAGE_TAG: A glowing neural network.",
        'thread': f"Input: Morning productivity.\nOutput: 1/ Your morning routine is your unfair advantage. ☀️\n---\n2/ 5 AM wake up? No. Intentional first hour? Yes. The compound effect starts before the world wakes up. IMAGE_TAG: Golden morning light.",
        'caption': f"Input: Leadership lessons.\nOutput: The best leaders ask more questions than they answer. Leadership isn't about having all the answers. #leadership #growth #mindset IMAGE_TAG: Confident professional.",
        'script': f"Input: Study tips.\nOutput: [Visual] Student at neon desk. [Audio] Stop studying for hours — do this instead. Try the Pomodoro method. IMAGE_TAG: Neon lit desk.",
        'blog': f"Input: Remote work.\nOutput: H1: The Remote Work Revolution\nH2: Why Offices Are Obsolete\n- Flexibility wins\n- Deep work over meetings. IMAGE_TAG: Minimalist home office.",
        'email': f"Input: Product launch.\nOutput: Subject: Open this before we sell out.\nBody: Hey, the wait is over. Our new product drops today and it's built to change how you work. Get yours now. IMAGE_TAG: Sleek gadget.",
        'ad': f"Input: Fitness coaching.\nOutput: Headline: Get fit without giving up pizza.\nBody: Our new coaching program is built for real life.\nCTA: Click here to start our 30-day challenge! IMAGE_TAG: Smiling athlete.",
        'pitch': f"Input: Clean energy startup.\nOutput: We are revolutionizing urban power grids. Our software reduces energy waste by 40% using AI. We're raising $2M to scale to 50 new cities next year. IMAGE_TAG: Solar panels."
    }
    
    example = examples.get(content_type, examples['single'])
    
    full_prompt = (
        f"{instruction}\n"
        f"{example}\n"
        f"Input: {prompt}\n"
        f"Output:"
    )

    try:
        with torch.inference_mode():
            results = generator(
                full_prompt,
                max_new_tokens=350,
                num_return_sequences=1,
                do_sample=True,
                temperature=dyn_temperature,
                top_p=0.92,
                repetition_penalty=1.25,
                no_repeat_ngram_size=3,
                return_full_text=False 
            )
        
        generated_posts = []
        image_prompts = []
        
        for r in results:
            raw_text = r['generated_text'].strip()
            
            # Smart Neural Segmentation
            parts = re.split(r'IMAGE_TAG:', raw_text, flags=re.IGNORECASE)
            post_content = parts[0].strip()
            img_desc = parts[1].strip() if len(parts) > 1 else prompt
            
            # Premium Cleaning
            post_content = re.sub(r'(Instruction|Output|Persona|###|Insight|Input):', '', post_content, flags=re.IGNORECASE).strip()
            
            # Sentence-aware truncation (Preserve newlines for threads/scripts!)
            punctuations = [m.start() for m in re.finditer(r'[\.\!\?]', post_content)]
            if punctuations:
                post_content = post_content[:punctuations[-1] + 1].strip()
            
            # Fallback
            if not post_content:
                post_content = f"An exploration into {prompt} — crafted for {platform}."
            
            img_desc = re.sub(r'[\.\!\?\n]', '', img_desc).strip()
            if not img_desc: img_desc = prompt

            generated_posts.append(post_content)
            image_prompts.append(img_desc)

        return jsonify({
            'results': generated_posts,
            'image_prompt': image_prompts[0] if image_prompts else prompt,
            'engine': 'Local-Neural-v1'
        })
    except Exception as e:
        logger.error(f"[LocalAI] Execution Error: {e}")
        return jsonify({'error': 'Neural Engine encountered a processing bottleneck.'}), 500

if __name__ == '__main__':
    app.run(port=5000, threaded=True, host='0.0.0.0')
