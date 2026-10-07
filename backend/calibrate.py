import json
import os
import sys

from app.services.nlp_engine import analyze_comment
from app.core.config import settings

def calculate_metrics(gold_file: str):
    with open(gold_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    thresholds = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85]
    
    print("| τ | Cobertura | Accuracy Sentimiento | Precision | Recall | F1 | REQUIRES_REVIEW (Recall) |")
    print("|---|---:|---:|---:|---:|---:|---:|")
    
    for tau in thresholds:
        # Override the threshold in settings for the test
        settings.DEFAULT_CONFIDENCE_THRESHOLD = tau
        
        y_true_aspects = []
        y_pred_aspects = []
        sentiment_correct = 0
        sentiment_total = 0
        
        req_rev_true = 0
        req_rev_pred = 0
        req_rev_tp = 0
        
        for item in data:
            raw_text = item["raw_text"]
            expected_aspects = {a["aspect"] for a in item["aspects"]}
            
            # Count expected requires_review
            has_doubt = item.get("requires_review", False)
            if has_doubt:
                req_rev_true += 1
                
            extracted = analyze_comment(raw_text)
            pred_aspects = {a["aspect_name"] for a in extracted}
            
            y_true_aspects.append(expected_aspects)
            y_pred_aspects.append(pred_aspects)
            
            # requires review logic
            pred_doubt = any(a["requires_review"] for a in extracted)
            if pred_doubt:
                req_rev_pred += 1
            if has_doubt and pred_doubt:
                req_rev_tp += 1
                
            # Sentiment accuracy (only for matching aspects)
            for ext in extracted:
                match = next((a for a in item["aspects"] if a["aspect"] == ext["aspect_name"]), None)
                if match:
                    sentiment_total += 1
                    if match["sentiment"] == ext["sentiment"]:
                        sentiment_correct += 1
                        
        # Calc metrics
        tp = sum(len(true_a.intersection(pred_a)) for true_a, pred_a in zip(y_true_aspects, y_pred_aspects))
        fp = sum(len(pred_a - true_a) for true_a, pred_a in zip(y_true_aspects, y_pred_aspects))
        fn = sum(len(true_a - pred_a) for true_a, pred_a in zip(y_true_aspects, y_pred_aspects))
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        acc_sent = sentiment_correct / sentiment_total if sentiment_total > 0 else 0
        
        cobertura = 1.0 - (req_rev_pred / len(data)) if len(data) > 0 else 0
        
        req_rev_recall = req_rev_tp / req_rev_true if req_rev_true > 0 else 0
        
        print(f"| {tau:.2f} | {cobertura*100:.1f}% | {acc_sent*100:.2f}% | {precision*100:.2f}% | {recall*100:.2f}% | {f1*100:.2f}% | {req_rev_recall*100:.2f}% |")

if __name__ == "__main__":
    calculate_metrics("../gold/dev_set_70.json")
