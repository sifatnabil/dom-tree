from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import pipeline

tokenizer = AutoTokenizer.from_pretrained("dbmdz/bert-large-cased-finetuned-conll03-english")

model = AutoModelForTokenClassification.from_pretrained("dbmdz/bert-large-cased-finetuned-conll03-english")

filename = "input-file.txt"

with open(filename, 'r', encoding='utf-8') as f:
    text = f.read()

def process_text(text):
    lines = text.split("\n")
    clean_text = " ".join(str(x.replace(u'\xa0', u' ')) for x in lines)
    return clean_text

example2 = process_text(text)

nlp = pipeline("ner", model=model, tokenizer=tokenizer)

ner_results = nlp(example2) 
print(ner_results)