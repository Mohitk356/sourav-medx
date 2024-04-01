import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import os
import requests

class ImageCounterApp:
    def __init__(self, master):
        self.master = master
        master.title("The Foto Uploader")
        self.image_count = tk.IntVar()
        self.image_count.set(0)
        self.uploaded_count = 0  # Counter for uploaded images
        self.cancel_upload = False  # Flag to track upload cancellation
        self.upload_in_progress = False  # Flag to track upload progress
        self.total_uploaded_count = 0  # Counter for total uploaded images
        self.upload_count = tk.IntVar()  # Counter for images being uploaded
        self.total_image_count = tk.IntVar()  # Counter for total images in folder
        # Set minimum size
        master.minsize(500, 600)

        # Screen text with bigger font and padding
        self.screen_text = tk.Label(master, text="The Foto Uploader", font=("Helvetica", 24), pady=40)
        self.screen_text.pack()

        # Text field to display selected folder path with placeholder
        self.path_entry = tk.Entry(master, width=50)
        self.path_entry.insert(0, "Selected Folder Path")
        self.path_entry.pack(pady=(10, 5))  # vertical padding of (10, 5)

        # Label to show total image files count
        self.count_label = tk.Label(master, text="Total image files: 0")
        self.count_label.pack()

        # Button to select folder
        self.select_folder_button = tk.Button(master, text="Select Folder", command=self.select_folder, padx=10, pady=5)  # Custom padding
        self.select_folder_button.pack(pady=5)

        # Text field for user to enter folder name with placeholder
        self.upload_id_label = tk.Label(master, text="Uploader ID:")
        self.upload_id_label.pack()

        self.folder_name_entry = tk.Entry(master, width=50)
        self.folder_name_entry.pack()

        # Button to start uploading
        self.submit_button = tk.Button(master, text="Start Uploading", command=self.start_uploading, padx=10, pady=5)  # Custom padding
        self.submit_button.pack(pady=10)

        # Cancel button
        self.cancel_button = tk.Button(master, text="Cancel Upload", command=self.cancel_uploading, state=tk.DISABLED, padx=10, pady=5)  # Custom padding
        self.cancel_button.pack(pady=5)

        # Reset counter button
        self.reset_button = tk.Button(master, text="Reset All", command=self.reset_all, padx=10, pady=5)  # Custom padding
        self.reset_button.pack(pady=5)

        # Progress bar
        self.progress = ttk.Progressbar(master, orient="horizontal", mode="determinate", length=400, variable=self.image_count, maximum=100)
        self.progress.pack(pady=10)

        # Label to show uploaded images count
        self.uploaded_label = tk.Label(master, text="Uploaded images: 0")
        self.uploaded_label.pack()

        # Label to show total uploaded images count
        self.total_uploaded_label = tk.Label(master, text="Total uploaded images: 0")
        self.total_uploaded_label.pack()

        self.select_folder_button.config(width=30)
        self.submit_button.config(width=30)
        self.cancel_button.config(width=30)
        self.reset_button.config(width=30)

    

    def cancel_uploading(self):
        self.cancel_upload = True

    def select_folder(self):
        self.selected_folder_path = filedialog.askdirectory()
        self.path_entry.delete(0, tk.END)  # Clear previous text
        self.path_entry.insert(0, self.selected_folder_path)
        self.update_count_label()

    def update_count_label(self):
        if not self.selected_folder_path:
            self.count_label.config(text="No folder selected")
            return

        image_count = self.count_images(self.selected_folder_path)
        self.count_label.config(text=f"Total image files: {image_count}")

        # Update total images in folder count
        self.total_image_count.set(image_count)

    def count_images(self, folder_path):
        self.image_count.set(0)
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']  # Add more if needed
        image_count = 0
        for filename in os.listdir(folder_path):
            if os.path.isfile(os.path.join(folder_path, filename)) and any(filename.lower().endswith(ext) for ext in image_extensions):
                image_count += 1

        self.progress["maximum"] = image_count
        self.progress.update()
        return image_count

    def start_uploading(self):
        confirmation = messagebox.askyesno("Confirmation", "Do you want to start uploading?")
        if confirmation:
            folder_path = self.path_entry.get()
            uploader_id = self.folder_name_entry.get()
            if not folder_path or not uploader_id:
                messagebox.showerror("Error", "Please select a folder and enter an uploader ID.")
                return
            
            # Reset counters and progress bar
            self.uploaded_count = 0
            self.total_uploaded_count = 0
            self.image_count.set(0)
            self.progress["value"] = 0
            self.cancel_upload = False
            self.upload_in_progress = True

            # Disable start upload button, reset button, and enable cancel button
            self.submit_button.config(state=tk.DISABLED)
            self.reset_button.config(state=tk.DISABLED)
            self.cancel_button.config(state=tk.NORMAL)

            # Filter image file extensions
            image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']

            # Iterate over files in the selected folder
            for filename in os.listdir(folder_path):
                if self.cancel_upload:
                    messagebox.showinfo("Info", "Upload cancelled.")
                    break
                
                filepath = os.path.join(folder_path, filename)
                if os.path.isfile(filepath) and any(filename.lower().endswith(ext) for ext in image_extensions):
                    try:
                        # Prepare data for POST request
                        files = {'file': open(filepath, 'rb')}
                        data = {'uploader_id': uploader_id}

                        # Send POST request to upload image
                        response = requests.get('http://google.com', files=files, data=data)

                        if response.status_code != 200:
                            # Increment uploaded count and update label
                            self.uploaded_count += 1
                            self.uploaded_label.config(text=f"Uploaded images: {self.uploaded_count}")

                            # Increment total uploaded count
                            self.total_uploaded_count += 1
                            self.total_uploaded_label.config(text=f"Total uploaded images: {self.total_uploaded_count}")

                            # Update progress bar
                            progress_value = self.total_uploaded_count
                            self.image_count.set(progress_value)
                            self.progress.update()

                        else:
                            messagebox.showerror("Error", f"Failed to upload {filename}")
                    except Exception as e:
                        messagebox.showerror("Error", f"Failed to upload {filename}: {e}")

            # Upload complete, enable start upload button, reset button, and disable cancel button
            self.upload_in_progress = False
            self.submit_button.config(state=tk.NORMAL)
            self.reset_button.config(state=tk.NORMAL)
            self.cancel_button.config(state=tk.DISABLED)

    def reset_all(self):
        self.uploaded_count = 0
        self.total_uploaded_count = 0
        self.image_count.set(0)
        self.progress["value"] = 0
        self.cancel_upload = False
        self.upload_in_progress = False
        self.uploaded_label.config(text="Uploaded images: 0")
        self.total_uploaded_label.config(text="Total uploaded images: 0")


        

def main():
    root = tk.Tk()
    app = ImageCounterApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
