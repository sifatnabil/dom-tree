import torch
import sys
from flair.data import Sentence
from flair.models import SequenceTagger


# filename = sys.argv[1];
filename = "input-file2.txt"

with open(filename, 'r', encoding='utf-8') as f:
    text = f.read()

def process_text(text):
    lines = text.split("\n")
    clean_text = " ".join(str(x.replace(u'\xa0', u' ')) for x in lines)
    return clean_text

example2 = process_text(text)

# tagger = SequenceTagger.load("flair/ner-english-large")

tagger = SequenceTagger.load('flair/ner-english-fast')

example1 = "My name is Wolfgang and I live in Berlin"

sentence = Sentence(example2)
tagger.predict(sentence)

persons = []

# print(sentence.get_spans('ner'))

predicted_output = sentence.to_dict(tag_type='ner')
entities = predicted_output["entities"]
for ent in entities: 
    for label in ent["labels"]:
        if "PER" in str(label):
            persons.append(ent['text'])
            # print(f"Name: {ent['text']}")
            break


# for entity in sentence.get_spans('ner'):
#     print(entity)

print(persons)