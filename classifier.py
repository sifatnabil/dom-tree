import os
import re
import shutil
import string
import tensorflow as tf
import pickle
import sys

from tensorflow.keras import layers
from tensorflow.keras import losses
from tensorflow.keras import preprocessing
from tensorflow.keras.layers.experimental.preprocessing import TextVectorization

def main(argv):
   new_model = tf.keras.models.load_model(r'basicClassifier')

   with open(r"tv_layer.pkl", "rb") as input_file:
      from_disk = pickle.load(input_file)

   test_vectorize_layer = TextVectorization.from_config(from_disk['config'])
   test_vectorize_layer.adapt(tf.data.Dataset.from_tensor_slices(["xyz"]))
   test_vectorize_layer.set_weights(from_disk['weights'])
   test_vectorize_layer.set_vocabulary(from_disk['vocabulary'])

   export_model = tf.keras.Sequential([
     test_vectorize_layer,
     new_model,
     layers.Activation('sigmoid')
   ])
   export_model.compile(
     loss=losses.BinaryCrossentropy(from_logits=False), optimizer="adam", metrics=['accuracy'])

   results = export_model.predict([argv[0]])
   print(results[0][0])
   sys.stdout.flush()

if __name__ == "__main__":
   main(sys.argv[1:])
