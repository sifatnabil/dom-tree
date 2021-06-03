import torch
import sys
from flair.data import Sentence
from flair.models import SequenceTagger


# filename = sys.argv[1];
filename = "input-file.txt";

with open(filename, 'r', encoding='utf-8') as f:
    text = f.read()

def process_text(text):
    lines = text.split("\n");
    clean_text = " ".join(str(x.replace(u'\xa0', u' ')) for x in lines)
    return clean_text

example2 = process_text(text)


model_path = '''C:\\Users\\BS542\\.flair\\models\\ner-english-large\\07301f59bb8cb113803be316267f06ddf9243cdbba92a4c8067ef92442d2c574.554244d3476d97501a766a98078421817b14654496b86f2f7bd139dc502a4f29'''
tagger = SequenceTagger.load(model_path)

example1 = "My name is Wolfgang and I live in Berlin"

sentence = Sentence(example2)
tagger.predict(sentence)

# for entity in sentence.get_spans('ner'):
#     print(entity)

print(sentence.get_spans('ner'))